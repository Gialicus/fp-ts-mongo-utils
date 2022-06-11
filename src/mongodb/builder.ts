import { append } from 'fp-ts/lib/Array'
import { flow } from 'fp-ts/lib/function'
import { NonEmptyArray } from 'fp-ts/lib/NonEmptyArray'
import { concat } from 'fp-ts/lib/NonEmptyArray'
import { Filter, Document } from 'mongodb'

const aggregateBuilder = (query: Filter<Document>) => flow(append(query))

export type MatchAg = {
  $match: Filter<Document>
}

export const ofMatch = (
  query: MatchAg
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(aggregateBuilder(query))

export type DollarString = `$${string}`

export type GroupAg = {
  $group: Filter<Document> & {
    _id: DollarString | Filter<Document>
  }
}

export const ofGroup = (
  query: GroupAg
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(aggregateBuilder(query))

export const ofCount = (
  $field: DollarString
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(aggregateBuilder({ $count: $field }))

export type SortAg<T extends Document & { _id: 1 | -1 } = { _id: -1 }> = {
  $sort: {
    [K in keyof T]: 1 | -1
  }
}

export const ofSort = (
  sort: SortAg
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(aggregateBuilder(sort))

export const matchAndGroup =
  (queryM: MatchAg) =>
  (
    queryG: GroupAg
  ): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
    flow(ofMatch(queryM), ofGroup(queryG))

export type MongoLookup = {
  $lookup: {
    from: string
    localField: string
    foreignField: string
    as: string
  }
}

export const ofLookup = (
  lookup: MongoLookup
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(append(lookup as Filter<Document>))

export type PluralString = `${string}s`

export type PluralStringWithId = `${PluralString}_id`

export type MongoLookupRef = {
  $lookup: {
    from: PluralString
    localField: PluralStringWithId
    foreignField: '_id'
    as: PluralString
  }
}

export const lookupFromRef = (ref: PluralString): Filter<Document> => ({
  $lookup: {
    from: ref,
    localField: ref + '_id',
    foreignField: '_id',
    as: ref,
  },
})

const matchLookupRef = (ref: PluralString): Filter<Document> => ({
  $match: {
    [ref + '.0']: {
      $exists: true,
    },
  },
})

const unwindFromRef = (ref: PluralString): Filter<Document> => ({
  $unwind: '$' + ref,
})

export const flatLookupFromRef = (
  ref: PluralString
): NonEmptyArray<Filter<Document>> => [
  lookupFromRef(ref),
  matchLookupRef(ref),
  unwindFromRef(ref),
]

export const ofLookupRef = (
  ref: PluralString
): ((init: Filter<Document>[]) => NonEmptyArray<Filter<Document>>) =>
  flow(concat(flatLookupFromRef(ref)))
