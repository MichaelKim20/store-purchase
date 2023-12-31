/**
 *  The web server of Remote Wallet Server
 *
 *  Copyright:
 *      Copyright (c) 2023 BOSAGORA Foundation All rights reserved.
 *
 *  License:
 *       MIT License. See LICENSE for details.
 */

import bodyParser from "body-parser";
import cors from "cors";
import { Scheduler } from "../modules/scheduler/Scheduler";
import { WebService } from "../modules/service/WebService";
import { Config } from "./common/Config";
import { cors_options } from "./option/cors";
import { RollupRouter } from "./routers/RollupRouter";
import { TransactionPool } from "./scheduler/TransactionPool";
import { RollupStorage } from "./storage/RollupStorage";

export class RollupServer extends WebService {
    /**
     * The collection of schedulers
     * @protected
     */
    protected schedules: Scheduler[] = [];

    /**
     * The configuration of the database
     * @private
     */
    private readonly config: Config;

    public readonly rollupRouter: RollupRouter;

    private readonly storage: RollupStorage;

    public readonly pool: TransactionPool;

    /**
     * Constructor
     * @param config Configuration
     * @param storage Rollup Storage
     * @param schedules Array of IScheduler
     */
    constructor(config: Config, storage: RollupStorage, schedules?: Scheduler[]) {
        super(config.server.port, config.server.address);

        this.config = config;
        this.storage = storage;
        this.pool = new TransactionPool();
        this.pool.storage = storage;

        this.rollupRouter = new RollupRouter(this, config, this.pool, this.storage);

        if (schedules) {
            schedules.forEach((m) => this.schedules.push(m));
            this.schedules.forEach((m) =>
                m.setOption({
                    config: this.config,
                    router: this.rollupRouter,
                    storage: this.storage,
                    pool: this.pool,
                })
            );
        }
    }

    /**
     * Setup and start the server
     */
    public async start(): Promise<void> {
        // parse application/x-www-form-urlencoded
        this.app.use(bodyParser.urlencoded({ extended: false, limit: "1mb" }));
        // parse application/json
        this.app.use(bodyParser.json({ limit: "1mb" }));
        this.app.use(cors(cors_options));

        this.rollupRouter.registerRoutes();

        for (const m of this.schedules) await (m as Scheduler).start();

        return super.start();
    }

    public stop(): Promise<void> {
        return new Promise<void>(async (resolve, reject) => {
            for (const m of this.schedules) await m.stop();
            for (const m of this.schedules) await m.waitForStop();
            if (this.server != null) {
                this.server.close((err?) => {
                    if (err) reject(err);
                    else resolve();
                });
            } else resolve();
        });
    }
}
