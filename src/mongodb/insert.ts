import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import { Collection, OptionalId, Document } from 'mongodb'
import { DbManager } from './constant'
import { closeDb, connectDb } from './connection'

export const chainInsert =
  (collection: Collection<Document>) =>
  (document: OptionalId<Document>): TE.TaskEither<Error, string> =>
    pipe(
      TE.tryCatch(() => collection.insertOne(document), E.toError),
      TE.map((inserted) => inserted.insertedId.toString())
    )

export const insertFP =
  (manager: DbManager) =>
  (document: OptionalId<Document>): TE.TaskEither<Error, string> =>
    pipe(
      connectDb(manager),
      TE.chain(() => chainInsert(manager.collection)(document)),
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
