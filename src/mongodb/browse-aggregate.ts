import { identity, pipe } from 'fp-ts/lib/function'
import { Filter, Collection, Document } from 'mongodb'
import * as TE from 'fp-ts/lib/TaskEither'
import * as T from 'fp-ts/lib/Task'
import * as O from 'fp-ts/lib/Option'
import * as E from 'fp-ts/lib/Either'
import { head } from 'fp-ts/lib/Array'
import { WithTotal } from './browse'
import { DbManager } from './interfaces'
import { closeDb, connectDb } from './connection'

const lazyBrowseAggregate =
  (query: Filter<Document>) => (collection: Collection<Document>) => () =>
    collection
      .aggregate([
        {
          $facet: {
            items: [
              {
                $match: query,
              },
            ],
            total: [
              {
                $match: query,
              },
              {
                $count: 'total',
              },
            ],
          },
        },
      ])
      .toArray()

const safeTotal = (doc: Document) =>
  pipe(
    doc.total,
    head,
    O.fold(
      () => 0,
      (v: { total: number }) => v.total
    )
  )

export const lazyWithTotalEmpty: () => WithTotal = () => ({
  items: [],
  total: 0,
})

export const browseAFP =
  (manager: DbManager) =>
  (query: Filter<Document>): TE.TaskEither<Error, WithTotal> =>
    pipe(
      connectDb(manager),
      TE.chain(() =>
        pipe(
          TE.tryCatch(
            lazyBrowseAggregate(query)(manager.collection),
            E.toError
          ),
          TE.chainFirst(() => closeDb(manager))
        )
      ),
      TE.orElse((originalError) =>
        pipe(
          closeDb(manager),
          TE.fold(TE.left, () => TE.left(originalError))
        )
      ),
      TE.map(head),
      TE.map(
        O.fold(lazyWithTotalEmpty, (result) => ({
          items: result.items,
          total: safeTotal(result),
        }))
      )
    )

export const browseA =
  (manager: DbManager) =>
  (query: Filter<Document>): Promise<WithTotal> =>
    pipe(
      browseAFP(manager)(query),
      T.map(E.fold(lazyWithTotalEmpty, identity))
    )()
