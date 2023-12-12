/*
 * Copyright 2023 Adobe. All rights reserved.
 * This file is licensed to you under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License. You may obtain a copy
 * of the License at http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software distributed under
 * the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR REPRESENTATIONS
 * OF ANY KIND, either express or implied. See the License for the specific language
 * governing permissions and limitations under the License.
 */

/* eslint-env mocha */

import chai from 'chai';
import chaiAsPromised from 'chai-as-promised';
import sinon from 'sinon';

import SitesController from '../../src/controllers/sites.js';
import { SiteDto } from '../../src/dto/site.js';

chai.use(chaiAsPromised);

const { expect } = chai;

describe('Sites Controller', () => {
  const sandbox = sinon.createSandbox();
  const sites = [
    { id: 'site1', baseURL: 'https://site1.com' },
    { id: 'site2', baseURL: 'https://site2.com' },
  ].map((site) => SiteDto.fromJson(site));

  const siteFunctions = [
    'createSite',
    'getAll',
    'getAllAsCSV',
    'getAllAsXLS',
    'getByBaseURL',
    'getByID',
    'removeSite',
    'updateSite',
  ];

  let mockDataAccess;
  let sitesController;

  beforeEach(() => {
    mockDataAccess = {
      addSite: sandbox.stub().resolves(sites[0]),
      updateSite: sandbox.stub().resolves(sites[0]),
      removeSite: sandbox.stub().resolves(),
      getSites: sandbox.stub().resolves(sites),
      getSiteByBaseURL: sandbox.stub().resolves(sites[0]),
      getSiteByID: sandbox.stub().resolves(sites[0]),
    };

    sitesController = SitesController(mockDataAccess);
  });

  afterEach(() => {
    sandbox.restore();
  });

  it('contains all controller functions', () => {
    siteFunctions.forEach((funcName) => {
      expect(sitesController).to.have.property(funcName);
    });
  });

  it('does not contain any unexpected functions', () => {
    Object.keys(sitesController).forEach((funcName) => {
      expect(siteFunctions).to.include(funcName);
    });
  });

  it('throws an error if data access is not an object', () => {
    expect(() => SitesController()).to.throw('Data access required');
  });

  it('creates a site', async () => {
    const response = await sitesController.createSite({ baseURL: 'https://site1.com' });

    expect(mockDataAccess.addSite.calledOnce).to.be.true;
    expect(response.status).to.equal(201);

    const site = await response.json();
    expect(site).to.have.property('id', 'site1');
    expect(site).to.have.property('baseURL', 'https://site1.com');
  });

  it('updates a site', async () => {
    const response = await sitesController.updateSite({
      params: { siteId: 'site1' },
      data: { imsOrgId: 'abcd124', isLive: false },
    });

    expect(mockDataAccess.updateSite.calledOnce).to.be.true;
    expect(response.status).to.equal(200);

    const site = await response.json();
    expect(site).to.have.property('id', 'site1');
    expect(site).to.have.property('baseURL', 'https://site1.com');
  });

  it('returns bad request when updating a site if id not provided', async () => {
    const response = await sitesController.updateSite({ params: {} });
    const error = await response.json();

    expect(mockDataAccess.removeSite.calledOnce).to.be.false;
    expect(response.status).to.equal(400);
    expect(error).to.have.property('message', 'Site ID required');
  });

  it('returns not found when updating a non-existing site', async () => {
    mockDataAccess.getSiteByID.resolves(null);

    const response = await sitesController.updateSite({ params: { siteId: 'site1' } });
    const error = await response.json();

    expect(mockDataAccess.removeSite.calledOnce).to.be.false;
    expect(response.status).to.equal(404);
    expect(error).to.have.property('message', 'Site not found');
  });

  it('returns bad request when updating a site without payload', async () => {
    const response = await sitesController.updateSite({ params: { siteId: 'site1' } });
    const error = await response.json();

    expect(mockDataAccess.removeSite.calledOnce).to.be.false;
    expect(response.status).to.equal(400);
    expect(error).to.have.property('message', 'Request body required');
  });

  it('returns bad request when updating a site without modifications', async () => {
    const response = await sitesController.updateSite({ params: { siteId: 'site1' }, data: {} });
    const error = await response.json();

    expect(mockDataAccess.removeSite.calledOnce).to.be.false;
    expect(response.status).to.equal(400);
    expect(error).to.have.property('message', 'No updates provided');
  });

  it('removes a site', async () => {
    const response = await sitesController.removeSite({ params: { siteId: 'site1' } });

    expect(mockDataAccess.removeSite.calledOnce).to.be.true;
    expect(response.status).to.equal(204);
  });

  it('returns bad request when removing a site if id not provided', async () => {
    const response = await sitesController.removeSite({ params: {} });
    const error = await response.json();

    expect(mockDataAccess.removeSite.calledOnce).to.be.false;
    expect(response.status).to.equal(400);
    expect(error).to.have.property('message', 'Site ID required');
  });

  it('gets all sites', async () => {
    mockDataAccess.getSites.resolves(sites);

    const result = await sitesController.getAll();
    const resultSites = await result.json();

    expect(mockDataAccess.getSites.calledOnce).to.be.true;
    expect(resultSites).to.be.an('array').with.lengthOf(2);
    expect(resultSites[0]).to.have.property('id', 'site1');
    expect(resultSites[0]).to.have.property('baseURL', 'https://site1.com');
    expect(resultSites[1]).to.have.property('id', 'site2');
    expect(resultSites[1]).to.have.property('baseURL', 'https://site2.com');
  });

  it('gets all sites as CSV', async () => {
    const result = await sitesController.getAllAsCSV();

    // expect(mockDataAccess.getSites.calledOnce).to.be.true;
    expect(result).to.not.be.null;
  });

  it('gets all sites as XLS', async () => {
    const result = await sitesController.getAllAsXLS();

    // expect(mockDataAccess.getSites.calledOnce).to.be.true;
    expect(result).to.not.be.null;
  });

  it('gets a site by ID', async () => {
    const result = await sitesController.getByID({ params: { siteId: 'site1' } });
    const site = await result.json();

    expect(mockDataAccess.getSiteByID.calledOnce).to.be.true;

    expect(site).to.be.an('object');
    expect(site).to.have.property('id', 'site1');
    expect(site).to.have.property('baseURL', 'https://site1.com');
  });

  it('gets a site by base URL', async () => {
    const result = await sitesController.getByBaseURL({ params: { baseURL: 'aHR0cHM6Ly9zaXRlMS5jb20K' } });
    const site = await result.json();

    expect(mockDataAccess.getSiteByBaseURL.calledOnceWith('https://site1.com')).to.be.true;

    expect(site).to.be.an('object');
    expect(site).to.have.property('id', 'site1');
    expect(site).to.have.property('baseURL', 'https://site1.com');
  });

  it('returns not found when site is not found by id', async () => {
    mockDataAccess.getSiteByID.resolves(null);

    const result = await sitesController.getByID({ params: { siteId: 'site1' } });
    const error = await result.json();

    expect(result.status).to.equal(404);
    expect(error).to.have.property('message', 'Site not found');
  });

  it('returns bad request if site ID is not provided', async () => {
    const result = await sitesController.getByID({ params: {} });
    const error = await result.json();

    expect(result.status).to.equal(400);
    expect(error).to.have.property('message', 'Site ID required');
  });

  it('returns 404 when site is not found by baseURL', async () => {
    mockDataAccess.getSiteByBaseURL.resolves(null);

    const result = await sitesController.getByBaseURL({ params: { baseURL: 'https://site1.com' } });
    const error = await result.json();

    expect(result.status).to.equal(404);
    expect(error).to.have.property('message', 'Site not found');
  });

  it('returns bad request if base URL is not provided', async () => {
    const result = await sitesController.getByBaseURL({ params: {} });
    const error = await result.json();

    expect(result.status).to.equal(400);
    expect(error).to.have.property('message', 'Base URL required');
  });
});
