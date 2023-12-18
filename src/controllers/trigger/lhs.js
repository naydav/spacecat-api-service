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

import { internalServerError, notFound, ok } from '@adobe/spacecat-shared-http-utils';
import { AUDIT_TYPE_LHS_DESKTOP, AUDIT_TYPE_LHS_MOBILE } from '@adobe/spacecat-shared-data-access/src/models/audit.js';

import { isAuditForAll, sendAuditMessages } from '../../support/utils.js';

/**
 * Retrieves sites for auditing based on the input URL. If the input URL has the value
 * 'all', then all sites will be audited. Otherwise, the input URL is assumed to be a base URL.
 * Sites are filtered to only include sites that have not disabled audits.
 *
 * @param {Object} dataAccess - The data access object for site operations.
 * @param {string} url - The URL to check for auditing.
 * @returns {Promise<Array<Site>>} The sites to audit.
 * @throws {Error} Throws an error if the site is not found.
 */
async function getSitesToAudit(dataAccess, url) {
  let sitesToAudit = [];

  if (isAuditForAll(url)) {
    sitesToAudit = await dataAccess.getSites();
  } else {
    const site = await dataAccess.getSiteByBaseURL(url);
    sitesToAudit = site ? [site] : [];
  }

  sitesToAudit = sitesToAudit.filter((site) => site.getAuditConfig().auditsDisabled() !== true);

  return sitesToAudit;
}

/**
 * Triggers audit processes for websites based on the provided URL.
 *
 * @param {Object} context - The context object containing dataAccess, sqs, data, and env.
 * @returns {Response} The response object with the audit initiation message or an error message.
 */
export default async function trigger(context) {
  try {
    const { dataAccess, sqs } = context;
    const { type, url, auditContext } = context.data;
    const { AUDIT_JOBS_QUEUE_URL: queueUrl } = context.env;

    const sitesToAudit = await getSitesToAudit(dataAccess, url);
    if (!sitesToAudit.length) {
      return notFound('Site not found');
    }

    const types = type === 'lhs' ? [AUDIT_TYPE_LHS_DESKTOP, AUDIT_TYPE_LHS_MOBILE] : [type];
    const message = [];

    for (const auditType of types) {
      const sitesToAuditForType = sitesToAudit.filter((site) => {
        const auditConfig = site.getAuditConfig();
        return !auditConfig.getAuditTypeConfig(auditType)?.disabled();
      });

      message.push(
        // eslint-disable-next-line no-await-in-loop
        await sendAuditMessages(
          sqs,
          queueUrl,
          auditType,
          auditContext,
          sitesToAuditForType.map((site) => site.getId()),
        ),
      );
    }

    return ok({ message });
  } catch (e) {
    return internalServerError(e);
  }
}
