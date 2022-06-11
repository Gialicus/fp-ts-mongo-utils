import * as NEA from 'fp-ts/lib/NonEmptyArray'
import { Collection, MongoClient, Document } from 'mongodb'

export const mongoURI: DbEnv = {
  url: 'mongodb://localhost:27017',
  dbName: 'gialifp',
  collectionName: 'heroes',
}

export interface DbEnv {
  url: string
  dbName: string
  collectionName: string
  ref?: NEA.NonEmptyArray<string>
}

export interface DbManager {
  client: MongoClient
  collection: Collection<Document>
  ref?: NEA.NonEmptyArray<string>
}
