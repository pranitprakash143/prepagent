"use server";

import { cookies } from "next/headers";

const BACKEND_URL = process.env.BACKEND_URL || "http://localhost:8000";

async function apiPost(path: string, body: unknown) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

async function apiGet(path: string, token: string) {
  const res = await fetch(`${BACKEND_URL}${path}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export async function signup(email: string, password: string, fullName?: string) {
  const user = await apiPost("/api/v1/auth/signup", {
    email,
    password,
    full_name: fullName,
  });

  const loginResult = await apiPost("/api/v1/auth/login", { email, password });
  const token = loginResult.access_token;

  setAuthCookie(token);

  return {
    token,
    user: { id: user.id, email: user.email, fullName: user.full_name, plan: user.plan },
  };
}

export async function login(email: string, password: string) {
  const data = await apiPost("/api/v1/auth/login", { email, password });
  const token = data.access_token;

  setAuthCookie(token);

  const user = await apiGet("/api/v1/users/me", token);

  return {
    token,
    user: { id: user.id, email: user.email, fullName: user.full_name, plan: user.plan || "FREE" },
  };
}

export async function refresh(token: string) {
  const data = await apiPost("/api/v1/auth/refresh", { refresh_token: token });
  setAuthCookie(data.access_token);
  return { token: data.access_token };
}

export async function getCurrentUser() {
  const token = getAuthToken();
  if (!token) return null;

  try {
    const user = await apiGet("/api/v1/users/me", token);
    return {
      id: user.id,
      email: user.email,
      fullName: user.full_name,
      plan: user.plan || "FREE",
      tenantId: user.tenant_id,
    };
  } catch {
    return null;
  }
}

export async function logout() {
  clearAuthCookie();
}

function getAuthToken(): string | undefined {
  return cookies().get("prepagent_token")?.value;
}

function setAuthCookie(token: string) {
  cookies().set("prepagent_token", token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60,
    path: "/",
  });
}

function clearAuthCookie() {
  cookies().set("prepagent_token", "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 0,
    path: "/",
  });
}
