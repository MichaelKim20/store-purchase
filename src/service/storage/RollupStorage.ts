/**
 *  The class that creates, inserts and reads the data into the database.
 *
 *  Copyright:
 *      Copyright (c) 2023 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import { BigNumber } from "ethers";
import { Block, BlockHeader, Hash, hashFull, Transaction } from "store-purchase-sdk";
import { Storage } from "../../modules/storage/Storage";
import { IDatabaseConfig } from "../common/Config";
import {
    createTablesQuery,
    deleteBlockByHeightQuery,
    deleteTxByHashQuery,
    getSetting,
    insertBlockQuery,
    insertTxQuery,
    selectBlockByHeightQuery,
    selectBlockLastHeight,
    selectTxByHashQuery,
    selectTxByLengthQuery,
    selectTxsLength,
    setSetting,
} from "./schema/RollupSchema";

export class RollupStorage extends Storage {
    constructor(databaseConfig: IDatabaseConfig, callback: (err: Error | null) => void) {
        super(databaseConfig, callback);
    }

    public createTables(): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.exec(createTablesQuery, (err) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public static make(databaseConfig: IDatabaseConfig): Promise<RollupStorage> {
        return new Promise<RollupStorage>((resolve, reject) => {
            const result: RollupStorage = new RollupStorage(databaseConfig, async (err: Error | null) => {
                if (err) reject(err);
                else {
                    return resolve(result);
                }
            });
        });
    }
    public insertBlock(_block: Block, _CID: string): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (_block?.header === undefined) reject("The data is not available.");
            if (_CID.length <= 0) reject("The CID is not valid.");
            const cur_hash: Hash = hashFull(_block.header);
            const header: BlockHeader = _block.header;
            this.database.run(
                insertBlockQuery,
                [
                    header.height.toString(),
                    cur_hash.toString(),
                    header.prev_block.toString(),
                    header.merkle_root.toString(),
                    header.timestamp,
                    _CID,
                ],
                (err: Error | null) => {
                    if (err) reject(err);
                    else resolve(true);
                }
            );
        });
    }

    /**
     * Deletes blocks with a block height less than the input value
     * @param height
     */
    public deleteBlockByHeight(height: bigint): Promise<void> {
        return new Promise((resolve, reject) => {
            this.database.run(deleteBlockByHeightQuery, [height.toString()], (err: Error | null) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    public insertTx(params: DBTransaction[]): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (params.length < 1) reject("The data is not available.");
            const statement = this.database.prepare(insertTxQuery);

            params.forEach((row) => {
                statement.run([
                    row.sequence,
                    row.purchase_id,
                    row.timestamp,
                    row.amount?.toString(),
                    row.franchisee_id,
                    row.user_email,
                    row.method,
                    row.signer,
                    row.signature,
                    row.hash,
                ]);
            });
            statement.finalize((err) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    public selectTxByLength(length: number): Promise<DBTransaction[]> {
        return new Promise<DBTransaction[]>((resolve, reject) => {
            this.database.all(selectTxByLengthQuery, [length], (err: Error | null, row: DBTransaction[]) => {
                if (err) reject(err);
                else resolve(row.map((tx: DBTransaction) => tx as DBTransaction));
            });
        });
    }

    public selectTxByHash(hash: string): Promise<DBTransaction | null> {
        return new Promise<DBTransaction | null>((resolve, reject) => {
            this.database.all(selectTxByHashQuery, [hash], (err: Error | null, row: DBTransaction[]) => {
                if (err) reject(err);
                else resolve(row.length > 0 ? (row[0] as DBTransaction) : null);
            });
        });
    }

    public deleteTxByHash(hash: string): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            this.database.run(deleteTxByHashQuery, [hash], (err: Error | null) => {
                if (err) reject(err);
                else resolve(true);
            });
        });
    }

    public selectTxsLength(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.database.all(selectTxsLength, [], (err: Error | null, row) => {
                if (err) reject(err);
                else { // @ts-ignore
                    resolve(row?.length ? row[0].count : null);
                }
            });
        });
    }

    public selectLastHeight(): Promise<bigint | null> {
        return new Promise((resolve, reject) => {
            this.database.all(selectBlockLastHeight, [], (err: Error | null, row) => {
                if (err) reject(err);
                if (row?.length) {
                    // @ts-ignore
                    if (row[0].height !== null) resolve(BigInt(row[0].height));
                    else resolve(null);
                } else {
                    resolve(null);
                }
            });
        });
    }

    public selectBlockByHeight(height: bigint): Promise<any> {
        return new Promise<any>((resolve, reject) => {
            this.database.all(selectBlockByHeightQuery, [height.toString()], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve(row[0]);
            });
        });
    }

    /**
     * Returns the settings stored in the database.
     * @param key   Key to Settings
     * @param defaultValue 기본값
     */
    public getSetting(key: string, defaultValue: string): Promise<string> {
        return new Promise<string>((resolve, reject) => {
            this.database.all(getSetting, [key], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve(row.length === 0 ? defaultValue : row[0].value);
            });
        });
    }

    /**
     * Save the settings to the database
     * @param key Key to Settings
     * @param value Value to set
     */
    public setSetting(key: string, value: string): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.database.all(setSetting, [key, value], (err: Error | null, row: any) => {
                if (err) reject(err);
                else resolve();
            });
        });
    }

    /**
     * Return the last sequence received
     */
    public async getLastReceiveSequence(): Promise<number> {
        return new Promise<number>((resolve, reject) => {
            this.getSetting("last_receive_sequence", "-1")
                .then((value) => resolve(Number(value)))
                .catch((e) => reject(e));
        });
    }

    /**
     * Save the last received sequence as a database
     * @param value Value to set
     */
    public async setLastReceiveSequence(value: number): Promise<void> {
        return new Promise<void>((resolve, reject) => {
            this.setSetting("last_receive_sequence", value.toString())
                .then(() => resolve())
                .catch((e) => reject(e));
        });
    }
}

export class DBTransaction {
    public sequence: number;
    public purchase_id: string;
    public timestamp: number;
    public amount: string;
    public franchisee_id: string;
    public user_email: string;
    public method: number;
    public signer: string;
    public signature: string;
    public hash: string;

    constructor(
        sequence: number,
        purchase_id: string,
        timestamp: number,
        amount: BigNumber,
        franchisee_id: string,
        user_email: string,
        method: number,
        signer?: string,
        signature?: string,
        hash?: string
    ) {
        this.sequence = sequence;
        this.purchase_id = purchase_id;
        this.timestamp = timestamp;
        this.amount = amount.toString();
        this.franchisee_id = franchisee_id;
        this.user_email = user_email;
        this.method = method;
        if (signer !== undefined) this.signer = signer;
        else this.signer = "";
        if (signature !== undefined) this.signature = signature;
        else this.signature = "";
        if (hash !== undefined) this.hash = hash;
        else this.hash = "";
    }

    public static make(tx: Transaction): DBTransaction {
        return { ...tx.toJSON(), hash: hashFull(tx).toString() };
    }

    public static converterTxArray(dbTx: DBTransaction[]): Transaction[] {
        return dbTx.map(
            (row) =>
                new Transaction(
                    row.sequence,
                    row.purchase_id,
                    row.timestamp,
                    BigNumber.from(row.amount),
                    row.franchisee_id,
                    row.user_email,
                    row.method,
                    row.signer,
                    row.signature
                )
        );
    }
}
