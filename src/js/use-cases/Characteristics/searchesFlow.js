import { callIdSearches, callSearches } from "./CRUDOperationsChar.js";
import { fail } from 'k6';

const modulePropertyFilter = {
    cmHandleQueryParameters: [{
        conditionName: 'hasAllModules',
        conditionParameters: [{ moduleName: 'ericsson-enm-GNBDU' }],
    }],
};

export function idSearchPublicPropertyFlow(data) {
    if (data.subsystemId === 0) {
        console.log('Subsystem id is ' + data.subsystemId);
        fail();
    }
    const body = getPublicPropertyFilterBody(data.subsystemId);
    callIdSearches(data.session, body, 'idSearchPublicProperty');
}

export function idSearchModulePropertyFlow(data) {
    callIdSearches(data.session, modulePropertyFilter, 'idSearchModuleProperty');
}

export function idSearchWithoutFilterFlow(data) {
    callIdSearches(data.session, {}, 'idSearchWithoutFilter');
}

export function searchPublicPropertyFlow(data) {
    if (data.subsystemId === 0) {
        console.log('Subsystem id is ' + data.subsystemId);
        fail();
    }
    const body = getPublicPropertyFilterBody(data.subsystemId);
    callSearches(data.session, body, 'searchPublicProperty');
}

export function searchModulePropertyFlow(data) {
    callSearches(data.session, modulePropertyFilter, 'searchModuleProperty');
}

export function searchWithoutFilterFlow(data) {
    callSearches(data.session, {}, 'searchWithoutFilter');
}

export function getPublicPropertyFilterBody(subsystemId) {
    const body = {
        cmHandleQueryParameters: [{
            conditionName: 'hasAllProperties',
            conditionParameters: [{ emsId: subsystemId }],
        }],
    };
    return body;
}