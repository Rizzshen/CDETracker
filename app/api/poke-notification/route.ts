// app/api/poke-notification/route.ts
import { NextRequest, NextResponse } from "next/server";
import { cert, getApps, initializeApp } from "firebase-admin/app";
import { getMessaging } from "firebase-admin/messaging";

// Initialize Firebase Admin (only once per cold start)
const firebaseApps = getApps();
const adminApp = firebaseApps.length > 0
  ? firebaseApps[0]
  : initializeApp({
      credential: cert(
        JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT || "{}"),
      ),
    });

export async function POST(req: NextRequest) {
  try {
    const { userToken, initiatorName } = await req.json();

    if (!userToken) {
      return NextResponse.json(
        { error: "No FCM token provided" },
        { status: 400 },
      );
    }

    // Send push notification
    await getMessaging(adminApp).send({
      token: userToken,
      notification: {
        title: "🥊 You Got Poked!",
        body: `${initiatorName} challenged you! Open the app to fight back!`,
      },
      android: {
        priority: "high",
      },
      apns: {
        payload: {
          aps: {
            sound: "default",
          },
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to send notification:", error);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
