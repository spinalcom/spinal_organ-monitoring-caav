/*
 * Copyright 2022 SpinalCom - www.spinalcom.com
 *
 * This file is part of SpinalCore.
 *
 * Please read all of the following terms and conditions
 * of the Free Software license Agreement ("Agreement")
 * carefully.
 *
 * This Agreement is a legally binding contract between
 * the Licensee (as defined below) and SpinalCom that
 * sets forth the terms and conditions that govern your
 * use of the Program. By installing and/or using the
 * Program, you agree to abide by all the terms and
 * conditions stated or referenced herein.
 *
 * If you do not agree to abide by these terms and
 * conditions, do not demonstrate your acceptance and do
 * not install or use the Program.
 * You should have received a copy of the license along
 * with this file. If not, see
 * <http://resources.spinalcom.com/licenses.pdf>.
 */

import { SpinalGraphService, SpinalNode, SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { spinalCore, FileSystem } from "spinal-core-connectorjs_type";
//import cron = require('node-cron');
import * as config from "../config";
import { Utils } from "./utils"
import * as constants from "./constants"
import { PositionDataLight, PositionsDataStore,PositionsDataStore2, PositionTempData, RoomData, RoomDataLight, RoomDataBlind, RoomTempData } from "./types";
const utils = new Utils();



class SpinalMain {
    connect: spinal.FileSystem;

    private CP_to_PositionsToData = new Map<string, PositionDataLight>();

    constructor() {
        const url = `${config.hubProtocol}://${config.userId}:${config.userPassword}@${config.hubHost}:${config.hubPort}/`;
        this.connect = spinalCore.connect(url)
    }

    /**
     * 
     * Initialize connection with the hub and load graph
     * @return {*}
     * @memberof SpinalMain
     */
    public init() {
        return new Promise((resolve, reject) => {


            spinalCore.load(this.connect, config.digitalTwinPath, async (graph: any) => {
                await SpinalGraphService.setGraph(graph);
                console.log("Connected to the hub");
                resolve(graph);
            }, () => {
                reject()
            })
        });
    }



    /**
     * The main function of the class
     */
    public async MainJob() {

        if (process.env.context_position !== "" && process.env.category_position !== "" && process.env.groupe_position !== "") {

            this.positionControl()

        }

        if (process.env.context_room !== "" && process.env.category_room !== "" && process.env.groupe_room !== "") {
            this.RoomControl()
        }

    }
    public async positionControl() {

        const Positions = await utils.getPositions(process.env.context_position, process.env.category_position, process.env.groupe_position);
        const Position_double_control = await utils.getPositions(process.env.context_position, process.env.category_position, process.env.groupe_position_double_control);

        console.log("Positions found : ", Positions.length);

        this.LightControl(Position_double_control);
        this.TempControl(Position_double_control);

        this.LightControl(Positions);
        this.StoresControl(Positions,Position_double_control);
        this.TempControl(Positions);

    }
    public async RoomControl() {

        const RoomList = await utils.getRoomList(process.env.context_room, process.env.category_room, process.env.groupe_room);
        console.log("rooms found : ", RoomList.length);

        this.RoomLightControl(RoomList);
        this.RoomBlindControl(RoomList);
        this.RoomTempControl(RoomList);

    }

    //functions for room logic

    public async getRoomDataLight(room: SpinalNodeRef, endpointName: string, controlPoint: string, bimObjectGroup: string): Promise<RoomDataLight> {
        const CP = await utils.getControlPoint(room.id.get(), controlPoint);

        const endpoint = await utils.getGroupsForRoom(room.id.get());
        return { room, CP_light: CP, LightEndPoint : endpoint};
    }

      public async getRoomDataStore(room: SpinalNodeRef): Promise<RoomDataBlind> {
        const CP = await utils.getControlPoint(room.id.get(), constants.StoreControlPoint);
        const CP_Rotation = await utils.getControlPoint(room.id.get(), constants.StroreRotationControlPoint);
        const storeINFO = await utils.getStoreForRoom(room.id.get(),constants.BlindEndpointName, constants.BlindRotEndpointName);
        return { room, CP, CP_Rotation, storeINFO };
    }
     public async getRoomTempData(room: SpinalNodeRef): Promise<RoomTempData> {
        const CP_temp = await utils.getControlPoint(room.id.get(), constants.TempControlPoint);
        const ConfortTempCP = await utils.getControlPoint(room.id.get(), constants.TempConfortControlPoint);
        const TempEndpoints = await utils.getRoomTempEndpoint(room.id.get())
        return { room, CP_temp, ConfortTempCP, TempEndpoints : { DecTempEndpoint: TempEndpoints?.DecTempEndpoint, ConfortTempEndpoint: TempEndpoints?.ConfortTempEndpoint } };
    }

    public async RoomLightControl(rooms: SpinalNodeRef[]) {


        const promises = rooms.map(async (room: SpinalNodeRef) => {
            const roomData = await this.getRoomDataLight(room, constants.groupdaliName, constants.LightControlPoint, process.env.groupe_detecteur);
            return roomData;
        });

        const roomList = await Promise.all(promises);

        await utils.BindRoomLight(roomList);
        console.log("done binding light control for rooms");

    }

    public async RoomBlindControl(rooms: SpinalNodeRef[]) {
        const promeses2 = rooms.map(async (room: SpinalNodeRef) => {
            const RoomBlindData = this.getRoomDataStore(room);
            return RoomBlindData;
        });

        const storeList = await Promise.all(promeses2);
        await utils.BindBlindControlPointForRoom(storeList);
        await utils.BindBlindRotationControlPointForRoom(storeList);

        console.log("done binding blind  control for rooms");

    }

        public async RoomTempControl(rooms: SpinalNodeRef[]) {


        const promeses3 = rooms.map(async (room: SpinalNodeRef) => {
            const RoomTempData = this.getRoomTempData(room);
            return RoomTempData;
        });
        const TempDataList = await Promise.all(promeses3);
        await utils.BindRoomTempControlPoint(TempDataList);
        await utils.BindRoomConfortTempControlPoint(TempDataList);
        console.log("done binding temp control for rooms");


    }

    //functions for open space logic
    public async getPositionDataLight(position: SpinalNodeRef): Promise<PositionDataLight> {
        const CP = await utils.getControlPoint(position.id.get(), constants.LightControlPoint);

        const endpoint = await utils.getGroupsForPosition(position.id.get());
        return { position, CP_light: CP, LightEndPoint : endpoint };
    }
    public async getPositionDataStore(position: SpinalNodeRef): Promise<PositionsDataStore> {
        const CP = await utils.getControlPoint(position.id.get(), constants.StoreControlPoint);
        const CP_Rotation = await utils.getControlPoint(position.id.get(), constants.StroreRotationControlPoint);
        const storeINFO = await utils.getStoreForPosition(position.id.get(), constants.BlindEndpointName, constants.BlindRotEndpointName);
        return { position, CP, CP_Rotation, storeINFO, doubleControl : false };
    }
    public async getPositionDataStoreDouble(position: SpinalNodeRef): Promise<PositionsDataStore2> {

        const storeINFO = await utils.getStoreForPosition(position.id.get(), constants.BlindEndpointName, constants.BlindRotEndpointName);
        const CP = await utils.getControlPoint(position.id.get(), constants.StoreControlPoint);
        const CP_Rotation = await utils.getControlPoint(position.id.get(), constants.StroreRotationControlPoint);
        const CP2 = await utils.getControlPoint(position.id.get(), constants.StoreControlPoint2);
        const CP_Rotation2 = await utils.getControlPoint(position.id.get(), constants.StoreRotationControlPoint2);
   
        return { position, CP, CP_Rotation, CP2, CP_Rotation2, storeINFO, doubleControl : true };
    }
  
    public async getPositionTempData(position: SpinalNodeRef): Promise<PositionTempData> {
        const CP_temp = await utils.getControlPoint(position.id.get(), constants.TempControlPoint);
        const ConfortTempCP = await utils.getControlPoint(position.id.get(), constants.TempConfortControlPoint);
        const TempEndpoints = await utils.getTempEndpoint(position.id.get())
        return { position, CP_temp, ConfortTempCP, TempEndpoints: { DecTempEndpoint: TempEndpoints?.DecTempEndpoint, ConfortTempEndpoint: TempEndpoints?.ConfortTempEndpoint } }
    }
    public async LightControl(Positions: SpinalNodeRef[]) {


        const promises = Positions.map(async (pos: SpinalNodeRef) => {
            const posData = await this.getPositionDataLight(pos);
            this.CP_to_PositionsToData.set(posData.CP_light?.id.get() || "", posData);
            return posData;
        });

        const PosList = await Promise.all(promises);
        await utils.BindPositionsToGrpDALI(PosList);
        console.log("done binding light control");

    }

    public async StoresControl(Positions: SpinalNodeRef[], Positions_double_control: SpinalNodeRef[]) {


        const promeses1 = Positions.map(async (pos: SpinalNodeRef) => {
            const PosStoreData = this.getPositionDataStore(pos);
            return PosStoreData;
        });

        const storeList = await Promise.all(promeses1);
        await utils.BindStoresControlPoint(storeList);
        await utils.BindStoresRotationControlPoint(storeList);

        const promeses2 = Positions_double_control.map(async (pos: SpinalNodeRef) => {
            const PosStoreDataDouble = this.getPositionDataStoreDouble(pos);
            return PosStoreDataDouble;
        });

        const doubleControlStoreList = await Promise.all(promeses2);

        await utils.BindStoresControlPoint(doubleControlStoreList);
        await utils.BindStoresRotationControlPoint(doubleControlStoreList);
        await utils.BindStoresControlPoint2(doubleControlStoreList);
        await utils.BindStoresRotationControlPoint2(doubleControlStoreList);

        console.log("done binding Blind control");

    }
    public async TempControl(Positions: SpinalNodeRef[]) {


        const promeses3 = Positions.map(async (pos: SpinalNodeRef) => {
            const PosTempData = this.getPositionTempData(pos);
            return PosTempData;
        });
        const TempDataList = await Promise.all(promeses3);
        await utils.BindTempControlPoint(TempDataList);
        await utils.BindConfortTempControlPoint(TempDataList);
        console.log("done binding temp control");


    }


}

async function Main() {
    try {
        console.log('Organ Start');
        const spinalMain = new SpinalMain();
        await spinalMain.init();
        await spinalMain.MainJob();
        //process.exit(0);
    }
    catch (error) {
        console.error(error);
        setTimeout(() => {
            console.log('STOP ERROR');
            process.exit(0);
        }, 5000);
    }
}


// Call main function
Main()