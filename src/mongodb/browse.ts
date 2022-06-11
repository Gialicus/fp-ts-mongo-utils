import { pipe } from 'fp-ts/lib/function'
import { Collection, Document, Filter, WithId } from 'mongodb'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import { DbManager } from './interfaces'
import { closeDb, connectDb } from './connection'

export interface WithTotal {
  items: WithId<Document>[]
  total: number
}

const find =
  (collection: Collection<Document>) => (query: Filter<Document>) => () =>
    TE.tryCatch(() => collection.find(query).toArray(), E.toError)
const total =
  (collection: Collection<Document>) => (query: Filter<Document>) => () =>
    TE.tryCatch(() => collection.count(query), E.toError)

const foldBrowse = (withTotalTE: TE.TaskEither<Error, WithTotal>) =>
  pipe(
    withTotalTE,
    T.map(
      E.fold(
        () => ({ items: [], total: 0 }),
        ({ items, total }) => ({ items, total })
      )
    )
  )

export const browseFP =
  (manager: DbManager) =>
  (query: Filter<Document>): TE.TaskEither<Error, WithTotal> =>
    pipe(
      connectDb(manager),
      TE.bind('items', find(manager.collection)(query)),
      TE.bind('total', total(manager.collection)(query)),
      TE.chainFirst(() => closeDb(manager)),
      TE.orElse((originalError) =>
        pipe(
          TE.tryCatch(() => manager.client.close(), E.toError),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      ),
      TE.map(({ items, total }) => ({ items, total }))
    )

export const browse =
  (manager: DbManager) =>
  (query: Filter<Document>): Promise<WithTotal> =>
    pipe(browseFP(manager)(query), foldBrowse)()
