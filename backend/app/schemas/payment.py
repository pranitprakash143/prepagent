from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel


class CreateStripeSessionRequest(BaseModel):
    price_id: str
    success_url: str
    cancel_url: str


class CreateRazorpayOrderRequest(BaseModel):
    plan: Literal["monthly", "yearly"]


class StripeSessionResponse(BaseModel):
    session_id: str
    url: str


class RazorpayOrderResponse(BaseModel):
    order_id: str
    amount: int
    currency: str
    key_id: str


class PaymentResponse(BaseModel):
    id: str
    provider: str
    provider_payment_id: Optional[str] = None
    amount: float
    currency: str
    status: str
    plan: str
    interval: Optional[str] = None
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class PlanResponse(BaseModel):
    plan: str
    features: list[str]


class SubscriptionStatusResponse(BaseModel):
    plan: str
    is_active: bool
    stripe_id: Optional[str] = None
