'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

const { _test } = require('../lib/apartment-export');
const geocoding = require('../lib/apartment-geocoding');

test('parseBool supports german/english and numeric values', () => {
  assert.equal(_test.parseBool('ja'), true);
  assert.equal(_test.parseBool('yes'), true);
  assert.equal(_test.parseBool('1'), true);
  assert.equal(_test.parseBool('nein'), false);
  assert.equal(_test.parseBool('no'), false);
  assert.equal(_test.parseBool(0), false);
  assert.equal(_test.parseBool('unknown'), null);
});

test('parseNumber parses decimal comma and invalid values', () => {
  assert.equal(_test.parseNumber('12,5'), 12.5);
  assert.equal(_test.parseNumber('10.25'), 10.25);
  assert.equal(_test.parseNumber(''), null);
  assert.equal(_test.parseNumber(null), null);
  assert.equal(_test.parseNumber('foo'), null);
});

test('normalizeDate and toSqFtFromSqm normalize values', () => {
  assert.equal(_test.normalizeDate('2026-03-06'), '2026-03-06');
  assert.equal(_test.normalizeDate('0000-00-00'), null);
  assert.equal(_test.normalizeDate(''), null);
  assert.equal(_test.toSqFtFromSqm('10'), 107.64);
  assert.equal(_test.toSqFtFromSqm('not-a-number'), null);
});

test('mapEstateToExport maps key fields to output contract', () => {
  const mapped = _test.mapEstateToExport({
    elements: {
      Id: 123,
      hausnummer: '5A',
      strasse: 'Teststrasse',
      ort: 'Berlin',
      plz: '10115',
      breitengrad: '52.520008',
      laengengrad: '13.404954',
      anzahl_schlafzimmer: '2',
      anzahl_badezimmer: '1',
      anzahl_zimmer: '3',
      wohnflaeche: '50',
      balkon: 'ja',
      moebliert: 'nein',
      warmmiete: '1200',
      kaltmiete: '1000',
      abdatum: '2026-05-01',
      bisdatum: '0000-00-00',
    },
  });

  assert.equal(mapped.id, '123');
  assert.equal(mapped.address.streetName, 'Teststrasse');
  assert.equal(mapped.address.city, 'Berlin');
  assert.equal(mapped.latitude, 52.520008);
  assert.equal(mapped.longitude, 13.404954);
  assert.equal(mapped.roomsTotal, 3);
  assert.equal(mapped.bedrooms, 2);
  assert.equal(mapped.bathrooms, 1);
  assert.equal(mapped.areaSqft, 538.19);
  assert.equal(mapped.features.balcony, true);
  assert.equal(mapped.features.furnished, false);
  assert.equal(mapped.rent.warmRent, 1200);
  assert.equal(mapped.rent.coldRent, 1000);
  assert.equal(mapped.availability.from, '2026-05-01');
  assert.equal(mapped.availability.until, null);
});

test('mapEstateToGeocodeRecord extracts address and current coordinates', () => {
  const mapped = _test.mapEstateToGeocodeRecord({
    elements: {
      Id: 456,
      objektnr_extern: 'A-456',
      strasse: 'Invalidenstrasse',
      hausnummer: '117',
      plz: '10115',
      ort: 'Berlin',
      breitengrad: '52.5321',
      laengengrad: '13.3849',
    },
  });

  assert.equal(mapped.id, '456');
  assert.equal(mapped.immoNr, 'A-456');
  assert.equal(mapped.address.streetName, 'Invalidenstrasse');
  assert.equal(mapped.address.buildingNumber, '117');
  assert.equal(mapped.address.zipCode, '10115');
  assert.equal(mapped.address.city, 'Berlin');
  assert.equal(mapped.latitude, 52.5321);
  assert.equal(mapped.longitude, 13.3849);
});

test('enrichApartmentsWithGeocodedCoordinates keeps existing coordinates and fills missing ones', async () => {
  const apartments = [
    {
      id: '1',
      address: {
        streetName: 'Knownstrasse',
        buildingNumber: '1',
        zipCode: '10115',
        city: 'Berlin',
      },
      latitude: 52.5,
      longitude: 13.4,
    },
    {
      id: '2',
      address: {
        streetName: 'Missingstrasse',
        buildingNumber: '2',
        zipCode: '10117',
        city: 'Berlin',
      },
      latitude: null,
      longitude: null,
    },
  ];

  const calls = [];
  await _test.enrichApartmentsWithGeocodedCoordinates(apartments, {
    headers: { 'User-Agent': 'test-agent' },
    fetchImpl: async (url) => {
      calls.push(url);
      return {
        ok: true,
        async json() {
          return [{ lat: '52.51', lon: '13.41' }];
        },
      };
    },
  });

  assert.equal(calls.length, 1);
  assert.equal(apartments[0].latitude, 52.5);
  assert.equal(apartments[0].longitude, 13.4);
  assert.equal(apartments[1].latitude, 52.51);
  assert.equal(apartments[1].longitude, 13.41);
});

test('enrichApartmentsWithGeocodedCoordinates skips geocoding when headers are missing', async () => {
  const apartments = [
    {
      id: '2',
      address: {
        streetName: 'Missingstrasse',
        buildingNumber: '2',
        zipCode: '10117',
        city: 'Berlin',
      },
      latitude: null,
      longitude: null,
    },
  ];

  await _test.enrichApartmentsWithGeocodedCoordinates(apartments, {
    headers: null,
    fetchImpl: async () => {
      throw new Error('should not be called');
    },
  });

  assert.equal(apartments[0].latitude, null);
  assert.equal(apartments[0].longitude, null);
});

test('buildPicturesMap groups images by estate id', () => {
  const picsMap = _test.buildPicturesMap([
    {
      elements: [
        { estateid: 1, url: 'https://a', type: 'Foto' },
        { estateMainId: 2, url: 'https://b', type: 'Titelbild' },
      ],
    },
    {
      elements: [{ estateid: 1, url: 'https://c', type: 'Grundriss' }],
    },
  ]);

  assert.equal(picsMap.get('1').length, 2);
  assert.equal(picsMap.get('2').length, 1);
});

test('sortPhotos prioritizes Titelbild then Foto then Grundriss and newest modified first', () => {
  const photos = [
    { type: 'Grundriss', modified: 10 },
    { type: 'Foto', modified: 15 },
    { type: 'Titelbild', modified: 1 },
    { type: 'Foto', modified: 20 },
  ];

  photos.sort(_test.sortPhotos);

  assert.deepEqual(
    photos.map((x) => `${x.type}:${x.modified}`),
    ['Titelbild:1', 'Foto:20', 'Foto:15', 'Grundriss:10']
  );
});

test('chunk and extract helpers keep expected behavior', () => {
  assert.deepEqual(_test.chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
  assert.deepEqual(_test.extractEstateRecords({ data: { records: [1, 2] } }), [1, 2]);
  assert.deepEqual(_test.extractEstateRecords({ data: {} }), []);

  assert.deepEqual(_test.extractPicturesRecords({ data: { records: [9] } }), [9]);
  assert.deepEqual(_test.extractPicturesRecords({ data: [8] }), [8]);
  assert.deepEqual(_test.extractPicturesRecords({ records: [7] }), [7]);
  assert.deepEqual(_test.extractPicturesRecords({ nope: true }), []);
});

test('getEstateLanguage defaults to ENG and supports env override', () => {
  const previous = process.env.ONOFFICE_ESTATE_LANGUAGE;

  delete process.env.ONOFFICE_ESTATE_LANGUAGE;
  assert.equal(_test.getEstateLanguage(), 'ENG');

  process.env.ONOFFICE_ESTATE_LANGUAGE = 'DEU';
  assert.equal(_test.getEstateLanguage(), 'DEU');

  if (previous === undefined) {
    delete process.env.ONOFFICE_ESTATE_LANGUAGE;
  } else {
    process.env.ONOFFICE_ESTATE_LANGUAGE = previous;
  }
});

test('geocoding helpers build provider params and CSV rows', () => {
  const address = {
    streetName: 'Teststrasse',
    buildingNumber: '5A',
    zipCode: '10115',
    city: 'Berlin',
  };

  assert.equal(geocoding.buildAddressLabel(address), 'Teststrasse 5A, 10115, Berlin');
  assert.equal(geocoding.hasAddressParts(address), true);
  assert.equal(geocoding.hasAddressParts({ city: 'Berlin' }), false);

  const params = geocoding.buildNominatimParams(address, {
    countryCode: 'DE',
    email: 'ops@example.com',
  });
  assert.equal(params.get('street'), 'Teststrasse 5A');
  assert.equal(params.get('postalcode'), '10115');
  assert.equal(params.get('city'), 'Berlin');
  assert.equal(params.get('countrycodes'), 'de');
  assert.equal(params.get('email'), 'ops@example.com');

  const csv = geocoding.toGeocodeCsv([
    {
      id: '123',
      immoNr: 'A-123',
      latitude: 52.5,
      longitude: 13.4,
      address,
      status: 'geocoded',
      query: 'Teststrasse 5A, 10115, Berlin',
      displayName: 'Test "Berlin"',
    },
  ]);

  assert.match(csv, /^Id,ImmoNr,breitengrad,laengengrad,/);
  assert.match(csv, /123,A-123,52\.5,13\.4,Teststrasse,5A,10115,Berlin,geocoded/);
  assert.match(csv, /"Test ""Berlin"""/);

  const importCsv = geocoding.toOnOfficeImportCsv([
    {
      immoNr: 'A-123',
      latitude: 52.5,
      longitude: 13.4,
    },
  ]);

  assert.equal(importCsv, 'ImmoNr,breitengrad,laengengrad\nA-123,52.5,13.4\n');
});
