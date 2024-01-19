"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const sdk_ts_1 = require("@injectivelabs/sdk-ts");
const networks_1 = require("@injectivelabs/networks");
const fs_1 = __importDefault(require("fs"));
function getAllDelegationsForValidators() {
    return __awaiter(this, void 0, void 0, function* () {
        const endpoints = (0, networks_1.getNetworkEndpoints)(networks_1.Network.Mainnet);
        const chainGrpcStakingApi = new sdk_ts_1.ChainGrpcStakingApi(endpoints.grpc);
        console.time("Fetching Validators");
        let validators = [];
        let offset = 0;
        const limit = 143;
        let totalValidators = 0;
        do {
            const response = yield chainGrpcStakingApi.fetchValidators({ offset, limit });
            validators = validators.concat(response.validators);
            if (!totalValidators) {
                totalValidators = response.pagination.total;
            }
            offset += response.validators.length;
        } while (validators.length < totalValidators);
        console.timeEnd("Fetching Validators");
        console.log(`Total number of validators: ${validators.length}`);
        const timestamp = new Date().toISOString();
        const filename = `delegations-${timestamp}.json`;
        let uniqueDelegators = new Set();
        for (let validator of validators) {
            const validatorAddress = validator.operatorAddress;
            console.time(`Fetching delegations for validator ${validatorAddress}`);
            const delegations = yield chainGrpcStakingApi.fetchValidatorDelegationsNoThrow({
                validatorAddress,
            });
            for (let delegation of delegations.delegations) {
                let delegationAddress = delegation.delegation.delegatorAddress;
                if (!uniqueDelegators.has(delegationAddress)) {
                    uniqueDelegators.add(delegationAddress);
                }
                fs_1.default.writeFileSync(filename, JSON.stringify(delegationAddress, null, 2));
            }
            console.timeEnd(`Fetching delegations for validator ${validatorAddress}`);
        }
    });
}
getAllDelegationsForValidators();
