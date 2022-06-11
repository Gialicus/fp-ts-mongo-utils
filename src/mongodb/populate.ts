import { constVoid, identity, pipe } from 'fp-ts/lib/function'
import * as NEA from 'fp-ts/lib/NonEmptyArray'
import * as T from 'fp-ts/lib/Task'
import * as E from 'fp-ts/lib/Either'
import * as O from 'fp-ts/lib/Option'
import { DbManager } from './constant'
import { aggregateFP } from './aggregate'
import { TaskEither } from 'fp-ts/lib/TaskEither'
import { Document } from 'mongodb'
import { flatLookupFromRef, lookupFromRef } from './builder'
import { concat } from 'fp-ts/lib/NonEmptyArray'
// import { append } from 'fp-ts/lib/Array'
// import { concat } from 'fp-ts/lib/NonEmptyArray'

export const populateFP =
  (manager: DbManager) =>
  (aggregate: NEA.NonEmptyArray<Document>): TaskEither<Error, Document[]> =>
    pipe(
      manager.ref,
      O.fromNullable,
      O.fold(constVoid() as never, identity),
      NEA.map((reference) =>
        reference.kind === 'ONE'
          ? flatLookupFromRef(reference.name, reference.as)
          : [lookupFromRef(reference.name, reference.as)]
      ),
      NEA.reduce(aggregate, (acc, lookup) => concat(acc)(lookup)),
      aggregateFP(manager)
    )

export const populate =
  (manager: DbManager) =>
  (aggregate: NEA.NonEmptyArray<Document>): Promise<Document[]> =>
    pipe(
      populateFP(manager)(aggregate),
      T.map(
        E.fold((e) => {
          throw e
        }, identity)
      )
    )()
