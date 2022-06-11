import * as NEA from 'fp-ts/lib/NonEmptyArray'
import { Collection, MongoClient, Document } from 'mongodb'
import { PluralString } from './builder'

export const mongoURI: DbEnv = {
  url: 'mongodb://localhost:27017',
  dbName: 'gialifp',
  collectionName: 'heroes',
}

export interface DbEnv {
  url: string
  dbName: string
  collectionName: string
  ref?: NEA.NonEmptyArray<MongoReference>
}

export interface DbManager {
  client: MongoClient
  collection: Collection<Document>
  ref?: NEA.NonEmptyArray<MongoReference>
}

export type MongoReference = {
  kind: 'ONE' | 'MANY'
  name: PluralString
}
