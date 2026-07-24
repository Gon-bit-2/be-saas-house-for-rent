export const NOTIFICATIONS_QUEUE = 'notifications'
export const SEND_PUSH_JOB = 'send-push'

export type SendPushJobData = {
  backgroundJobId: number
  notificationId: number
}
