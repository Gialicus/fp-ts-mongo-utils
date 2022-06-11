import { identity, pipe } from 'fp-ts/lib/function'
import { Document, Filter } from 'mongodb'
import { DbManager } from './constant'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import { closeDb, connectDb } from './connection'

export const aggregateFP =
  (manager: DbManager) =>
  (aggregate: Filter<Document>[]): TE.TaskEither<Error, Document[]> =>
    pipe(
      connectDb(manager),
      TE.chain(() =>
        TE.tryCatch(
          () => manager.collection.aggregate(aggregate).toArray(),
          E.toError
        )
      ),
      TE.orElse((originalError) =>
        pipe(
          closeDb(manager),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      )
    )
export const aggregate =
  (manager: DbManager) =>
  (aggregate: Filter<Document>[]): Promise<Document[]> =>
    pipe(aggregateFP(manager)(aggregate), T.map(E.fold(() => [], identity)))()
