import { Injectable } from '@nestjs/common'
import { applicationDefault, getApps, initializeApp, type App } from 'firebase-admin/app'
import { getMessaging, type Messaging } from 'firebase-admin/messaging'

@Injectable()
export class FirebaseProvider {
  private app?: App

  getMessaging(): Messaging {
    if (!this.app) {
      this.app = getApps()[0] ?? initializeApp({ credential: applicationDefault() })
    }
    return getMessaging(this.app)
  }
}
