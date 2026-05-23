import { useEffect, useRef } from "react";
import { Redirect, router, Slot } from "expo-router";
import * as Notifications from "expo-notifications";
import { useAuthStore } from "../src/store/auth";
import { useNotificationStore } from "../src/store/notifications";

import {
  registerForPushNotifications,
  addNotificationResponseListener,
} from "../src/lib/notifications";

export default function RootLayout() {
  const initialize = useAuthStore((s) => s.initialize);
  const { subscribe, unsubscribe, fetchUnreadCount } = useNotificationStore();
  const responseListener = useRef<Notifications.EventSubscription | null>(null);

  useEffect(() => {
    initialize().then(() => {
      const { user } = useAuthStore.getState();
      if (user) {
        registerForPushNotifications(user.id);
        subscribe(user.id);
        fetchUnreadCount(user.id);
      }
    });

    responseListener.current = addNotificationResponseListener((response) => {
      const data = response.notification.request.content.data;
      if (data?.type === "message" && data?.conversationId) {
        router.push({
          pathname: "/chat/[id]",
          params: { id: data.conversationId as string },
        });
      } else if (data?.type === "request") {
        router.push("/(tabs)/requests");
      }
    });

    return () => {
      if (responseListener.current) {
        responseListener.current.remove();
      }
      unsubscribe();
    };
  }, []);

  return <Slot />;
}
