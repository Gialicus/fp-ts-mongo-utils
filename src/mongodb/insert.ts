import { identity, pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import * as A from 'fp-ts/lib/Array'
import { OptionalId, Document, ObjectId } from 'mongodb'
import { DbManager } from './interfaces'
import { closeDb, connectDb } from './connection'
import { fold, fromNullable } from 'fp-ts/lib/Option'

export const insertPipe =
  (manager: DbManager) =>
  (document: OptionalId<Document>): TE.TaskEither<Error, string> =>
    pipe(
      TE.tryCatch(() => manager.collection.insertOne(document), E.toError),
      TE.map((inserted) => inserted.insertedId.toString()),
      TE.chainFirst(() => closeDb(manager))
    )

const recordToArray = (record: Record<string, ObjectId>) =>
  pipe(
    Object.keys(record),
    A.map((k) => fromNullable(record[k])),
    A.map(
      fold(
        () => '',
        (id) => id.toString()
      )
    )
  )

export const insertManyPipe =
  (manager: DbManager) =>
  (documents: OptionalId<Document>[]): TE.TaskEither<Error, string[]> =>
    pipe(
      TE.tryCatch(() => manager.collection.insertMany(documents), E.toError),
      TE.map((inserted) => recordToArray(inserted.insertedIds)),
      TE.chainFirst(() => closeDb(manager))
    )

export const insertFP =
  (manager: DbManager) =>
  (document: OptionalId<Document>): TE.TaskEither<Error, string> =>
    pipe(
      connectDb(manager),
      TE.chain(() => insertPipe(manager)(document)),
      TE.orElse((originalError) =>
        pipe(
          closeDb(manager),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      )
    )
export const insertManyFP =
  (manager: DbManager) =>
  (documents: OptionalId<Document>[]): TE.TaskEither<Error, string[]> =>
    pipe(
      connectDb(manager),
      TE.chain(() => insertManyPipe(manager)(documents)),
      TE.orElse((originalError) =>
        pipe(
          closeDb(manager),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      )
    )

export const insert =
  (manager: DbManager) =>
  (document: OptionalId<Document>): Promise<string> =>
    pipe(
      insertFP(manager)(document),
      T.map(
        E.fold(
          () => '',
          (id) => id
        )
      )
    )()

export const insertMany =
  (manager: DbManager) =>
  (documents: OptionalId<Document>[]): Promise<string[]> =>
    pipe(insertManyFP(manager)(documents), T.map(E.fold(() => [], identity)))()
