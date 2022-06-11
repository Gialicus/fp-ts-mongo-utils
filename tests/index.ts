import { OptionalId, Document, Filter, ObjectId, WithId } from 'mongodb'
import {
  browse,
  browseA,
  injectMongo,
  insert,
  populate,
  WithTotal,
} from '../src'
import { aggregate } from '../src/mongodb/aggregate'
import { matchAndGroup, ofGroup, ofMatch } from '../src/mongodb/builder'
import { DbManager, mongoURI } from '../src/mongodb/constant'
import { read } from '../src/mongodb/read'

describe('test insert', () => {
  let manager: DbManager
  let manager2: DbManager
  let manager3: DbManager
  let insertP: (document: OptionalId<Document>) => Promise<string>
  let insertP2: (document: OptionalId<Document>) => Promise<string>
  let insertP3: (document: OptionalId<Document>) => Promise<string>
  let browseP: (query: Filter<Document>) => Promise<WithTotal>
  let aggregateP: (query: Filter<Document>) => Promise<WithTotal>
  let readOne: (query: Filter<Document>) => Promise<WithId<Document> | null>
  let aggregationFramework: (
    aggregate: Filter<Document>[]
  ) => Promise<Document[]>

  beforeAll(() => {
    manager = injectMongo({
      ...mongoURI,
      ref: [
        { kind: 'ONE', name: 'helms' },
        { kind: 'ONE', name: 'chests' },
      ],
    })
    manager2 = injectMongo({ ...mongoURI, collectionName: 'helms' })
    manager3 = injectMongo({ ...mongoURI, collectionName: 'chests' })
    insertP = insert(manager)
    insertP2 = insert(manager2)
    insertP3 = insert(manager3)
    browseP = browse(manager)
    aggregateP = browseA(manager)
    readOne = read(manager)
    aggregationFramework = aggregate(manager)
  })

  it('should return string', async () => {
    const id = await insertP({
      name: 'giali',
      age: 75,
    })
    expect(id).toBeTruthy()
  })

  it('should browse sucessfully', async () => {
    const response = await browseP({ name: 'batman' })
    expect(response.items).toHaveLength(response.total)
    expect(response.total).toBeGreaterThan(0)
  })
  it('should return empty total', async () => {
    const response = await browseP({ name: Math.random() })
    expect(response.items).toHaveLength(response.total)
    expect(response.total).toBe(0)
  })
  it('should aggregate sucessfully', async () => {
    const response = await aggregateP({ name: 'giali' })
    expect(response.items).toHaveLength(response.total)
    expect(response.total).toBeGreaterThan(0)
  })
  it('should return empty total for aggregation', async () => {
    const response = await aggregateP({ name: Math.random() })
    expect(response.items).toHaveLength(response.total)
    expect(response.total).toBe(0)
  })
  it('should findOne', async () => {
    const result = await readOne({
      name: 'batman',
    })
    expect(result?.age).toBe(75)
  })
  it('should create match aggregate', async () => {
    const match = ofMatch({ $match: { name: 'giali' } })([])
    expect(match.length).toBe(1)
    expect(match).toStrictEqual([{ $match: { name: 'giali' } }])
  })
  it('should create group aggregate', async () => {
    const group = ofGroup({ $group: { _id: '$name', name: 'giali' } })([])
    expect(group.length).toBe(1)
    expect(group).toStrictEqual([{ $group: { _id: '$name', name: 'giali' } }])
  })
  it('should match&group aggregate', async () => {
    const group = matchAndGroup({
      $match: {
        name: 'giali',
      },
    })({
      $group: {
        _id: {
          name: '$name',
        },
        count: { $sum: 1 },
      },
    })([])
    const response = await aggregationFramework(group)
    expect(response.length).toBe(1)
  })
  it('should lookup collections', async () => {
    const id2 = await insertP2({
      head: 'maschera',
    })
    const id3 = await insertP3({
      body: 'batvestito',
    })
    const id4 = await insertP3({
      body: 'batmantello',
    })
    const id = await insertP({
      name: 'batman',
      age: 75,
      helms_id: new ObjectId(id2),
      chests_id: [new ObjectId(id3), new ObjectId(id4)],
    })
    expect(id).toBeTruthy()
    const res = await populate(manager)([{ $match: { name: 'batman' } }])
    res.forEach((doc) => {
      expect(doc.helms).toBeTruthy()
      expect(doc.chests).toBeTruthy()
    })
  })

  it('should return mongo error', async () => {
    const res = await populate(manager)([{ $gorup: { name: 'batman' } }])
    console.log(JSON.stringify(res[0]?.message, null, 2))
    expect(res[0]?.message).toBe("Unrecognized pipeline stage name: '$gorup'")
  })
})
