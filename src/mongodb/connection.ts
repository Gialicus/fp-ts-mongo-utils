import { pipe } from 'fp-ts/lib/function'
import { MongoClient } from 'mongodb'
import { DbManager, DbEnv } from './constant'
import * as TE from 'fp-ts/lib/TaskEither'
import * as E from 'fp-ts/lib/Either'

export const createConnection = (url: string): (() => MongoClient) => {
  let client: MongoClient | null = null
  return () => {
    if (!client) {
      client = new MongoClient(url)
      return client
    } else {
      return client
    }
  }
}
export const connectDb = (
  manager: DbManager
): TE.TaskEither<Error, MongoClient> =>
  TE.tryCatch(() => manager.client.connect(), E.toError)

export const closeDb = (manager: DbManager): TE.TaskEither<Error, void> =>
  TE.tryCatch(() => manager.client.close(), E.toError)

const getCollection = (env: DbEnv) => (client: MongoClient) => ({
  client: client,
  collection: client.db(env.dbName).collection(env.collectionName),
  ref: env.ref,
})

export const injectMongo = (env: DbEnv): DbManager =>
  pipe(createConnection(env.url)(), getCollection(env))
