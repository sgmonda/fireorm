import { BaseFirestoreBatchRepository } from './BaseFirestoreBatchRepository';
import { getFixture } from '../../test/fixture';
import { initialize } from '../MetadataStorage';
import { Band } from '../../test/BandCollection';
import { Firestore, WriteBatch } from '@google-cloud/firestore';
import { FirestoreBatchUnit } from './FirestoreBatchUnit';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const MockFirebase = require('mock-cloud-firestore');

describe('BaseFirestoreBatchRepository', () => {
  let bandRepository: BaseFirestoreBatchRepository<Band> = null;
  let firestore: Firestore;
  let batch: FirestoreBatchUnit;
  let batchStub: jest.Mocked<WriteBatch>;

  beforeEach(() => {
    const fixture = Object.assign({}, getFixture());
    const firebase = new MockFirebase(fixture, {
      isNaiveSnapshotListenerEnabled: false,
    });

    batchStub = {
      create: jest.fn(),
      update: jest.fn(),
      set: jest.fn(),
      delete: jest.fn(),
      commit: jest.fn(),
    };

    firestore = Object.assign(firebase.firestore(), { batch: () => batchStub });
    initialize(firestore);

    batch = new FirestoreBatchUnit(firestore);
    bandRepository = new BaseFirestoreBatchRepository(batch, Band);
  });

  describe('create', () => {
    it('must create items when id is passed', async () => {
      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];

      bandRepository.create(entity);
      await batch.commit();

      expect(batchStub.set.mock.calls[0][1]).toEqual({
        id: 'perfect-circle',
        name: 'A Perfect Circle',
        formationYear: 1999,
        genres: ['alternative-rock', 'alternative-metal', 'hard-rock'],
      });
    });

    it('must create items and assign a custom id if no id is passed', async () => {
      const entity = new Band();
      entity.name = 'The Pinapple Thief';
      entity.formationYear = 1999;
      entity.genres = ['progressive-rock'];

      bandRepository.create(entity);
      await batch.commit();

      const data = batchStub.set.mock.calls[0][1] as Band;

      expect(typeof data.id).toEqual('string');
      expect(data.name).toEqual('The Pinapple Thief');
      expect(data.formationYear).toEqual(1999);
      expect(data.genres).toEqual(['progressive-rock']);
    });

    it.todo('must be able to create document from anonymous object without id');
  });

  describe('update', () => {
    it('must call batch.update', async () => {
      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];

      bandRepository.create(entity);
      await batch.commit();

      entity.name = 'Un Círculo Perfecto';
      bandRepository.update(entity);
      await batch.commit();

      expect(batchStub.update.mock.calls[0][1]).toEqual({
        id: 'perfect-circle',
        name: 'Un Círculo Perfecto',
        formationYear: 1999,
        genres: ['alternative-rock', 'alternative-metal', 'hard-rock'],
      });
    });
  });

  describe('delete', () => {
    it('must call batch.delete', async () => {
      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];

      bandRepository.delete(entity);
      await batch.commit();

      expect(batchStub.delete.mock.calls[0][1]).toEqual({
        id: 'perfect-circle',
        name: 'A Perfect Circle',
        formationYear: 1999,
        genres: ['alternative-rock', 'alternative-metal', 'hard-rock'],
      });
    });
  });

  describe('should run validations', () => {
    it('should run validations', async () => {
      initialize(firestore, { validateModels: true });

      const validationBatch = new FirestoreBatchUnit(firestore);
      const validationBandRepository = new BaseFirestoreBatchRepository(validationBatch, Band);

      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];
      entity.contactEmail = 'Not an email';

      validationBandRepository.create(entity);

      try {
        await validationBatch.commit();
      } catch (error) {
        expect(error[0].constraints.isEmail).toEqual('Invalid email!');
      }
    });

    it('should not run validations on delete', async () => {
      initialize(firestore, { validateModels: true });

      const validationBatch = new FirestoreBatchUnit(firestore);
      const validationBandRepository = new BaseFirestoreBatchRepository(validationBatch, Band);

      const entity = new Band();
      entity.id = 'perfect-circle';
      entity.name = 'A Perfect Circle';
      entity.formationYear = 1999;
      entity.genres = ['alternative-rock', 'alternative-metal', 'hard-rock'];
      entity.contactEmail = 'email@apc.com';

      validationBandRepository.create(entity);
      await validationBatch.commit();

      entity.contactEmail = 'email';
      validationBandRepository.delete(entity);
      expect(validationBatch.commit).not.toThrow();
    });
  });

  //TODO: for this to work I'll probably need to do the collectionPath refactor
  // Copy from BaseFirestoreTransactionRepository.spec
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  describe('must handle subcollections', () => {});
});
