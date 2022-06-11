import { pipe } from 'fp-ts/lib/function'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import { OptionalId, Document } from 'mongodb'
import { DbManager } from './constant'
import { closeDb, connectDb } from './connection'

export const insertFP =
  (manager: DbManager) =>
  (document: OptionalId<Document>): TE.TaskEither<Error, string> =>
    pipe(
      connectDb(manager),
      TE.chain(() =>
        pipe(
          TE.tryCatch(() => manager.collection.insertOne(document), E.toError),
          TE.map((inserted) => inserted.insertedId.toString()),
          TE.chainFirst(() => closeDb(manager))
        )
      ),
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
