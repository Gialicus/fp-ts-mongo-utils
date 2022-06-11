import { identity, pipe } from 'fp-ts/lib/function'
import { Filter, Document, WithId } from 'mongodb'
import { closeDb, connectDb } from './connection'
import { DbManager } from './constant'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'

export const readFP =
  (manager: DbManager) =>
  (query: Filter<Document>): TE.TaskEither<Error, WithId<Document> | null> =>
    pipe(
      connectDb(manager),
      TE.tryCatchK(() => manager.collection.findOne(query), E.toError),
      TE.orElse((originalError) =>
        pipe(
          closeDb(manager),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      )
    )

export const read =
  (manager: DbManager) =>
  (query: Filter<Document>): Promise<WithId<Document> | null> =>
    pipe(readFP(manager)(query), T.map(E.fold(() => null, identity)))()
