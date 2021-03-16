import firebase from 'firebase'
import {
  ErrorDatabase,
  SavedTrackedErrors,
  TrackedErrors,
} from 'error-issue-tracker-sdk'

const config = {
  apiKey: process.env.REACT_APP_apiKey,
  authDomain: process.env.REACT_APP_authDomain,
  projectId: process.env.REACT_APP_projectId,
  storageBucket: process.env.REACT_APP_storageBucket,
  messagingSenderId: process.env.REACT_APP_messagingSenderId,
  appId: process.env.REACT_APP_appId,
  measurementId: process.env.REACT_APP_measurementId,
}

firebase.initializeApp(config)

const firestore = firebase.firestore()

export default class ErrorFirestore implements ErrorDatabase {
  private readonly ref: firebase.firestore.CollectionReference
  constructor() {
    this.ref = firestore.collection('trackedErrors')
  }
  async save(error: TrackedErrors): Promise<SavedTrackedErrors> {
    if (error.id) {
      await this.ref.doc(error.id).set(error)
      return error as SavedTrackedErrors
    }
    const docRef = await this.ref.add(error)
    return {
      ...error,
      id: docRef.id,
    }
  }
  async fetch(projectId: string): Promise<SavedTrackedErrors[]> {
    const snapshots = (
      await (await this.ref.where('projectId', '==', projectId)).get()
    ).docs
    return snapshots.map((snapshot) => {
      const data = snapshot.data() as SavedTrackedErrors
      return { ...data, id: snapshot.id }
    })
  }
}
