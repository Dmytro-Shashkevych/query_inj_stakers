import { ChainGrpcStakingApi } from '@injectivelabs/sdk-ts';
import { getNetworkEndpoints, Network } from '@injectivelabs/networks';
import sqlite3 from 'sqlite3';
import { open, Database, } from 'sqlite';

async function openDb(): Promise<Database<sqlite3.Database, sqlite3.Statement>> {
    return open({
        filename: './DelegatorPerValidator.db',
        driver: sqlite3.Database
    });
}

async function closeDb(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
    await db.close();
}

async function setupDatabase(db: Database<sqlite3.Database, sqlite3.Statement>): Promise<void> {
    await db.exec(`CREATE TABLE IF NOT EXISTS delegations (
                                                              delegatorAddress TEXT,
                                                              validatorAddress TEXT,
                                                              amount TEXT,
                                                              PRIMARY KEY (delegatorAddress, validatorAddress)
        )`);
}

async function storeDelegationData(db: Database<sqlite3.Database, sqlite3.Statement>, delegatorAddress: string, validatorAddress: string, amount: string): Promise<void> {
    await db.run(`INSERT OR REPLACE INTO delegations (delegatorAddress, validatorAddress, amount)
                  VALUES (?, ?, ?)`, [delegatorAddress, validatorAddress, amount]);
}

async function getAllDelegationsForValidators(): Promise<void> {
    const db = await openDb();
    await setupDatabase(db);

    const endpoints = getNetworkEndpoints(Network.Mainnet);
    const chainGrpcStakingApi = new ChainGrpcStakingApi(endpoints.grpc);

    console.time("Fetching Validators");
    let validators: any[] = [];
    let offset = 0;
    const limit = 143;
    let totalValidators: number | null = null;

    do {
        const response = await chainGrpcStakingApi.fetchValidators({ offset, limit });
        validators = validators.concat(response.validators);
        totalValidators = totalValidators ?? response.pagination.total;
        offset += limit;

    } while (offset < totalValidators!);
    console.timeEnd("Fetching Validators");

    console.log(`Total number of validators: ${validators.length}`);

    for (let validator of validators) {
        const validatorAddress = validator.operatorAddress;
        console.time(`Fetching delegations for validator ${validatorAddress}`);

        const delegations = await chainGrpcStakingApi.fetchValidatorDelegationsNoThrow({
            validatorAddress,
        });

        for (let delegation of delegations.delegations) {
            let delegatorAddress = delegation.delegation.delegatorAddress;
            let amount = delegation.balance.amount;
            if (amount != "0") {
                await storeDelegationData(db, delegatorAddress, validatorAddress, amount);
            }
        }

        console.timeEnd(`Fetching delegations for validator ${validatorAddress}`);
    }

    await closeDb(db);

    console.log("Database operations completed.");
}

getAllDelegationsForValidators();
