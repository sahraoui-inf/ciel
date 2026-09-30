import { prisma } from "./db";
import { logger } from "./logger";

type NotificationInput = {
  userId: string;
  type: string;
  title: string;
  messageEn?: string;
  messageAr?: string;
  data?: Record<string, unknown>;
};

export async function dispatchNotification(input: NotificationInput) {
  try {
    await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        channel: "in_app",
        title: input.title,
        messageEn: input.messageEn,
        messageAr: input.messageAr,
        data: input.data ? JSON.stringify(input.data) : null,
      },
    });
  } catch (err) {
    logger.error({ err, input }, "Failed to dispatch notification");
  }
}

export async function notifyUser(params: {
  userId: string;
  type: string;
  titleEn: string;
  titleAr?: string;
  messageEn?: string;
  messageAr?: string;
}) {
  await dispatchNotification({
    userId: params.userId,
    type: params.type,
    title: params.titleEn,
    messageEn: params.messageEn,
    messageAr: params.messageAr,
  });
}
