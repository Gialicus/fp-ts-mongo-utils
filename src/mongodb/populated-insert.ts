import { constVoid, identity, pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { OptionalId, Document } from 'mongodb'
import { DbManager, MongoReference } from './interfaces'
import { closeDb, connectDb, injectMongo } from './connection'
import { handleRef } from './populate'
import { insertFP, insertManyFP } from './insert'

const insertOne =
  (manager: DbManager) =>
  (ref: MongoReference) =>
  (document: OptionalId<Document>) =>
    pipe(
      injectMongo({
        url: manager.url,
        dbName: manager.dbName,
        collectionName: ref.name,
      }),
      TE.of,
      TE.chain((refManager) =>
        pipe(
          O.fromNullable(document[ref.name]),
          O.fold(() => {
            throw new Error('empty ref')
          }, identity),
          (doc) => insertFP(refManager)(doc)
        )
      )
    )

const insertMany =
  (manager: DbManager) =>
  (ref: MongoReference) =>
  (document: OptionalId<Document>) =>
    pipe(
      injectMongo({
        url: manager.url,
        dbName: manager.dbName,
        collectionName: ref.name,
      }),
      TE.of,
      TE.chain((refManager) =>
        pipe(
          O.fromNullable(document[ref.name]),
          O.fold(() => [], identity),
          (docs) => insertManyFP(refManager)(docs)
        )
      )
    )

export const populatedInsertFP =
  (manager: DbManager) => (document: OptionalId<Document>) =>
    pipe(
      handleRef(manager.ref),
      NEA.map((reference) =>
        reference.kind === 'ONE'
          ? insertOne(manager)(reference)(document)
          : insertMany(manager)(reference)(document)
      )
      //   connectDb(manager),
      //   TE.chain(() =>
      //     pipe(
      //       TE.tryCatch(() => manager.collection.insertOne(document), E.toError),
      //       TE.map((inserted) => inserted.insertedId.toString()),
      //       TE.chainFirst(() => closeDb(manager))
      //     )
      //   ),
      //   TE.orElse((originalError) =>
      //     pipe(
      //       closeDb(manager),
      //       TE.fold(TE.left, () => TE.left(originalError))
      //     )
      //   )
    )
