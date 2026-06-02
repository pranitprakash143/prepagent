import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.security import get_current_user
from app.models.payment import Payment
from app.models.user import User
from app.schemas.payment import (
    CreateRazorpayOrderRequest,
    CreateStripeSessionRequest,
    PaymentResponse,
    RazorpayOrderResponse,
    StripeSessionResponse,
    SubscriptionStatusResponse,
)

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/payments", tags=["payments"])

PLANS = {
    "monthly": {"price": 999, "price_id": settings.STRIPE_PRICE_ID_MONTHLY},
    "yearly": {"price": 9999, "price_id": settings.STRIPE_PRICE_ID_YEARLY},
}


@router.post("/create-stripe-session", response_model=StripeSessionResponse)
async def create_stripe_session(
    body: CreateStripeSessionRequest,
    current_user: User = Depends(get_current_user),
):
    try:
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
    except Exception as e:
        logger.error("Stripe not configured: %s", e)
        raise HTTPException(status_code=503, detail="Payment service not configured")

    try:
        session = stripe.checkout.Session.create(
            customer_email=current_user.email,
            line_items=[{"price": body.price_id, "quantity": 1}],
            mode="subscription",
            success_url=body.success_url,
            cancel_url=body.cancel_url,
            metadata={"user_id": current_user.id},
        )
        return StripeSessionResponse(session_id=session.id, url=session.url)
    except Exception as e:
        logger.error("Stripe session creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create checkout session")


@router.post("/webhook/stripe")
async def stripe_webhook(request: Request):
    try:
        import stripe

        stripe.api_key = settings.STRIPE_SECRET_KEY
    except Exception as e:
        logger.error("Stripe not configured: %s", e)
        raise HTTPException(status_code=503, detail="Payment service not configured")

    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    if not sig_header:
        raise HTTPException(status_code=400, detail="Missing stripe-signature header")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        await _handle_checkout_completed(session)
    elif event["type"] == "customer.subscription.updated":
        subscription = event["data"]["object"]
        await _handle_subscription_updated(subscription)
    elif event["type"] == "customer.subscription.deleted":
        subscription = event["data"]["object"]
        await _handle_subscription_deleted(subscription)

    return {"received": True}


async def _handle_checkout_completed(session: dict):
    user_id = session.get("metadata", {}).get("user_id")
    if not user_id:
        logger.warning("No user_id in session metadata")
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.id == user_id))
        user = result.scalars().first()
        if user:
            user.plan = "PRO"
            user.stripe_id = session.get("customer")
            db.add(user)
            await db.commit()


async def _handle_subscription_updated(subscription: dict):
    customer_id = subscription.get("customer")
    status = subscription.get("status")
    if not customer_id:
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.stripe_id == customer_id))
        user = result.scalars().first()
        if user:
            user.plan = "PRO" if status == "active" else "FREE"
            db.add(user)
            await db.commit()


async def _handle_subscription_deleted(subscription: dict):
    customer_id = subscription.get("customer")
    if not customer_id:
        return
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(User).where(User.stripe_id == customer_id))
        user = result.scalars().first()
        if user:
            user.plan = "FREE"
            db.add(user)
            await db.commit()


@router.post("/create-razorpay-order", response_model=RazorpayOrderResponse)
async def create_razorpay_order(
    body: CreateRazorpayOrderRequest,
    current_user: User = Depends(get_current_user),
):
    if not settings.RAZORPAY_KEY_ID or not settings.RAZORPAY_KEY_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    plan_config = PLANS.get(body.plan)
    if not plan_config:
        raise HTTPException(status_code=400, detail="Invalid plan")

    try:
        import razorpay

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        order = client.order.create(
            {
                "amount": plan_config["price"],
                "currency": "INR",
                "receipt": f"order_{current_user.id}_{body.plan}",
                "notes": {"user_id": current_user.id, "plan": body.plan},
            }
        )
        return RazorpayOrderResponse(
            order_id=order["id"],
            amount=order["amount"],
            currency=order["currency"],
            key_id=settings.RAZORPAY_KEY_ID,
        )
    except Exception as e:
        logger.error("Razorpay order creation failed: %s", e)
        raise HTTPException(status_code=500, detail="Failed to create order")


@router.post("/webhook/razorpay")
async def razorpay_webhook(request: Request):
    if not settings.RAZORPAY_WEBHOOK_SECRET:
        raise HTTPException(status_code=503, detail="Razorpay not configured")

    payload = await request.body()
    signature = request.headers.get("x-razorpay-signature")

    if not signature:
        raise HTTPException(status_code=400, detail="Missing signature header")

    try:
        import razorpay

        client = razorpay.Client(
            auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
        )
        client.utility.verify_webhook_signature(
            payload.decode(), signature, settings.RAZORPAY_WEBHOOK_SECRET
        )
    except Exception as e:
        logger.error("Razorpay webhook verification failed: %s", e)
        raise HTTPException(status_code=400, detail="Invalid signature")

    event = json.loads(payload)
    if event.get("event") == "payment.captured":
        payment = event.get("payload", {}).get("payment", {}).get("entity", {})
        notes = payment.get("notes", {})
        user_id = notes.get("user_id")
        if user_id:
            async with AsyncSessionLocal() as db:
                result = await db.execute(select(User).where(User.id == user_id))
                user = result.scalars().first()
                if user:
                    user.plan = "PRO"
                    db.add(user)
                    await db.commit()

    return {"received": True}


@router.get("/subscription", response_model=SubscriptionStatusResponse)
async def get_subscription(
    current_user: User = Depends(get_current_user),
):
    return SubscriptionStatusResponse(
        plan=current_user.plan,
        is_active=current_user.plan == "PRO",
        stripe_id=current_user.stripe_id,
    )


@router.get("/history", response_model=list[PaymentResponse])
async def get_payment_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Payment)
        .where(
            Payment.tenant_id == current_user.id,
            Payment.user_id == current_user.id,
        )
        .order_by(Payment.created_at.desc())
        .limit(20)
    )
    payments = result.scalars().all()
    return [
        PaymentResponse(
            id=p.id,
            provider=p.provider,
            provider_payment_id=p.provider_payment_id,
            amount=p.amount,
            currency=p.currency,
            status=p.status,
            plan=p.plan,
            interval=p.interval,
            created_at=p.created_at,
        )
        for p in payments
    ]
