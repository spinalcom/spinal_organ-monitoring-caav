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

import { SpinalGraphService, SpinalNodeRef } from "spinal-env-viewer-graph-service";
import { SpinalNode } from "spinal-model-graph"
import { spinalCore, Process, Val } from "spinal-core-connectorjs_type";
import * as constants from "./constants"
import { NetworkService, InputDataEndpoint, InputDataEndpointDataType, InputDataEndpointType } from "spinal-model-bmsnetwork"
import { SpinalAttribute } from "spinal-models-documentation/declarations";
import { attributeService, ICategory } from "spinal-env-viewer-plugin-documentation-service";
import { InfoStore, PositionDataLight, PositionsDataStore, PositionsDataStore2, PositionTempData, RoomDataBlind, RoomDataLight,RoomTempData, tempObject } from "./types";
import { ProcessBind } from "./processBind";
import { all } from "axios";
import { info } from "console";
export const networkService = new NetworkService()



/**
 * @export
 * @class Utils
 */
export class Utils {
    processBind: ProcessBind = new ProcessBind();
    ATTRIBUTE_NAME = "controlValue";
    INIT_ZONE_MODE = "initZoneMode";
    ATTRIBUTE_CATEGORY_NAME = "default";
    DEFAULT_COMMAND_VALUE = "null";
    store_filter = "SRG_ELE_Moteur store";


    /**
     

    /**
     * Function that returns Positions from an equipment context 
     * @param  {string} contextName
     * @param  {string} categoryName
     * @param  {string} GroupName
     * @returns Promise
     */
    public async getPositions(ContextName: string, CategoryName: string, GroupName: string): Promise<SpinalNodeRef[]> {
        try {
            const Context = SpinalGraphService.getContext(ContextName);
            if (!Context) {
                console.log("Context not found");
                return [];
            }

            const ContextID = Context.info.id.get();
            const category = (await SpinalGraphService.getChildren(ContextID, ["hasCategory"])).find(child => child.name.get() === CategoryName);
            if (!category) {
                console.log("Category 'Typologie' not found");
                return [];
            }

            const categoryID = category.id.get();
            const Groups = await SpinalGraphService.getChildren(categoryID, ["hasGroup"]);
            if (Groups.length === 0) {
                console.log("No groups found under the category");
                return [];
            }

            const PosGroup = Groups.find(group => group.name.get() === GroupName);
            if (!PosGroup) {
                console.log("Group 'Positions de travail' not found");
                return [];
            }

            //console.log("Group 'Positions de travail' found:", PosGroup);

            const Positions = await SpinalGraphService.getChildren(PosGroup.id.get(), ["groupHasBIMObject"]);
            if (Positions.length === 0) {
                console.log("No positions found in the bmsgroup");
                return [];
            }

            //console.log("Positions found:", Positions);
            return Positions;

        } catch (error) {
            console.error("Error in getPositions:", error);
            return [];
        }
    }

    public async getRoomList(ContextName: string, CategoryName: string, GroupName: string): Promise<SpinalNodeRef[]> {
        try {
            const Context = SpinalGraphService.getContext(ContextName);
            if (!Context) {
                console.log("Context not found");
                return [];
            }
            //console.log("Context found:", Context.info.name.get());

            const ContextID = Context.info.id.get();
            const category = (await SpinalGraphService.getChildren(ContextID, ["hasCategory"])).find(child => child.name.get() === CategoryName);
            if (!category) {
                console.log("Category 'Typologie' not found");
                return [];
            }
            //console.log("Category found:", category.name.get());

            const categoryID = category.id.get();
            const Groups = await SpinalGraphService.getChildren(categoryID, ["hasGroup"]);
            if (Groups.length === 0) {
                console.log("No groups found under the category");
                return [];
            }
            //console.log("Groups found :", Groups.map(group => group.name.get()));

            const RoomGroup = Groups.find(group => group.name.get() === GroupName);
            if (!RoomGroup) {
                console.log("Group  not found");
                return [];
            }

            //console.log("Group 'Positions de travail' found:", RoomGroup);

            const roomlist = await SpinalGraphService.getChildren(RoomGroup.id.get(), ["groupHasgeographicRoom"]);
            if (roomlist.length === 0) {
                console.log("rooms not found in the group");
                return [];
            }

            return roomlist;

        } catch (error) {
            console.error("Error in getRoomList:", error);
            return [];
        }
    }

    public async getEndpointForRoom(endpointName: string, roomId: string, bimObjectGroup : string): Promise<SpinalNodeRef[]> {
        const NODE_TO_ENDPOINT_RELATION = "hasBmsEndpoint";
        const NODE_TO_BIM_OBJECT_RELATION = "hasBimObject";
        const matchingEndpoints: SpinalNodeRef[] = [];

        const allBimObjects = await SpinalGraphService.getChildren(roomId, [NODE_TO_BIM_OBJECT_RELATION]);
        if (allBimObjects.length === 0) {
            console.log("No BIM objects found for the room with ID:", roomId);
            return [];
        }
        for (const bimObject of allBimObjects) {

            const parents = await SpinalGraphService.getParents(bimObject.id.get(), ["groupHasBIMObject"]);
            if (parents.length !== 0) {
                const isobject = parents.some(parent => parent.name.get() == bimObjectGroup);
                if (isobject) {
                    const endpoints = await SpinalGraphService.getChildren(bimObject.id.get(), [NODE_TO_ENDPOINT_RELATION]);
                    if (endpoints.length !== 0) {
                        const matchingEndpoint = endpoints.filter(endpoint => endpoint.name.get().includes(endpointName));
                        matchingEndpoints.push(...matchingEndpoint);
                    }
                }
            }
        }
        

        

        return matchingEndpoints; // Return the list of matching endpoints
    }

     

    public async getControlPoint(workpositionId: string, controlPointName: String): Promise<SpinalNodeRef | undefined> {
        const NODE_TO_CONTROL_POINTS_RELATION = "hasControlPoints";
        const CONTROL_POINTS_TO_BMS_ENDPOINT_RELATION = "hasBmsEndpoint";

        // Fetch all control points associated with the work position
        const allControlPoints = await SpinalGraphService.getChildren(workpositionId, [NODE_TO_CONTROL_POINTS_RELATION]);

        if (allControlPoints.length > 0) {
            for (const controlPoint of allControlPoints) {
                // Fetch all BMS endpoints associated with the control point
                const allBmsEndpoints = await SpinalGraphService.getChildren(controlPoint.id.get(), [CONTROL_POINTS_TO_BMS_ENDPOINT_RELATION]);

                if (allBmsEndpoints.length > 0) {
                    for (const bmsEndPoint of allBmsEndpoints) {
                        // Check if the BMS endpoint matches the criteria
                        if (bmsEndPoint.name.get() === controlPointName) {
                            //const nodeElement = await bmsEndPoint.element.load();
                                return bmsEndPoint; // Return the matching endpoint
                            
                        }
                    }
                }
            }
        }

        // Return undefined if no matching endpoint is found
        return undefined;
    }



    public async getGroupsForPosition(workpositionId: string): Promise<SpinalNodeRef > {
        
        const allbimObjects = await SpinalGraphService.getChildren(workpositionId, ["hasNetworkTreeBimObject"]);
        const DetResults = await Promise.all(
            allbimObjects.map(async (bimObject) => {
                const parents = await SpinalGraphService.getParents(bimObject.id.get(), ["groupHasBIMObject"]);
                if (parents.length !== 0) {
                    const isDetecteur = parents.some(parent => parent.name.get() == process.env.groupe_detecteur);
                    if (isDetecteur) return bimObject;
                }
                return null;
            })
        );
        const detList = DetResults.filter((b): b is SpinalNodeRef => b !== null);
        for (const det of detList) {
            const grpDALI = (await SpinalGraphService.getChildren(det.id.get(), ["hasBmsEndpoint"])).find(child => child.name.get().includes("GRP"));
            if (grpDALI) {

                const Allendpoints = await SpinalGraphService.getChildren(grpDALI.id.get(), ["hasBmsEndpoint"]);
                const updateEndpoint = Allendpoints.find(child => child.name.get() === constants.LightEndpointName);
                

                if (updateEndpoint) {

                    return updateEndpoint;
                }
                
            }
        }

        return undefined

    }

    public async getGroupsForRoom(roomId: string): Promise<SpinalNodeRef> {
        
        const allbimObjects = await SpinalGraphService.getChildren(roomId, ["hasBimObject"]);
        const DetResults = await Promise.all(
            allbimObjects.map(async (bimObject) => {
                const parents = await SpinalGraphService.getParents(bimObject.id.get(), ["groupHasBIMObject"]);
                if (parents.length !== 0) {
                    const isDetecteur = parents.some(parent => parent.name.get() == process.env.groupe_detecteur);
                    if (isDetecteur) return bimObject;
                }
                return null;
            })
        );
        const detList = DetResults.filter((b): b is SpinalNodeRef => b !== null);
        for (const det of detList) {
            const grpDALI = (await SpinalGraphService.getChildren(det.id.get(), ["hasBmsEndpoint"])).find(child => child.name.get().includes("GRP"));
            if (grpDALI) {

                const Allendpoints = await SpinalGraphService.getChildren(grpDALI.id.get(), ["hasBmsEndpoint"]);
                const updateEndpoint = Allendpoints.find(child => child.name.get() === constants.LightEndpointName);

                if (updateEndpoint) {
                    return updateEndpoint ;
                }
            }
        }

        return undefined;
    }


    // function to get stores linked to position 
    public async getStoreForPosition(workpositionId: string, posBso : string, posLamelle: string): Promise<InfoStore[]> {
        const result: InfoStore[] = [];
        const allbimObjects = await SpinalGraphService.getChildren(workpositionId, ["hasNetworkTreeBimObject"]);
        const storeResults = await Promise.all(
            allbimObjects.map(async (bimObject) => {
                const parents = await SpinalGraphService.getParents(bimObject.id.get(), ["groupHasBIMObject"]);
                if (parents.length !== 0) {
                    const isStore = parents.some(parent => parent.name.get() == process.env.groupe_store);
                    if (isStore) return bimObject;
                }
                return null;
            })
        );
        const stores = storeResults.filter((b): b is SpinalNodeRef => b !== null);
        const seenBsoIds = new Set<string>();
        for (const store of stores) {
            const bso = await SpinalGraphService.getChildren(store.id.get(), ["hasBmsEndpoint"]);
            if (bso.length ===0) continue;
            // const bsoID = bso[0].id.get();

            // Avant on prenait le premier trouvé car il y'en avait qu'un dont le nom commence par BSO_GRPB_  
            // Maintenant on prend celui qui commence par SBC car il y'en a 2 et c'est le seul qui commence par SBC
            const correctEndpoint = bso.find(child => child.name.get().startsWith("SBC"))
            if (!correctEndpoint) {
                console.log("No SBC endpoint found for store:", store.name.get());
                continue;
            }
            const bsoID = correctEndpoint.id.get();
            if (seenBsoIds.has(bsoID)) continue;
            seenBsoIds.add(bsoID);
            const bmsEndpoints = await SpinalGraphService.getChildren(bsoID, ["hasBmsEndpoint"]);
            const PositionBSO = bmsEndpoints.find(child => child.name.get() === posBso);
            const PositionLamelle = bmsEndpoints.find(child => child.name.get() === posLamelle);
            if (PositionBSO && PositionLamelle) {
                result.push({ bso: correctEndpoint, posBsoEndpoint: PositionBSO, posLamelleEndpoint: PositionLamelle });
            }
            
        }

        return result;
    } 


    public async getStoreForRoom(roomid: string, posBso: string, posLamelle: string): Promise<InfoStore[]> {
        const result: InfoStore[] = [];
        const allbimObjects = await SpinalGraphService.getChildren(roomid, ["hasBimObject"]);
        const storeResults = await Promise.all(
            allbimObjects.map(async (bimObject) => {
                const parents = await SpinalGraphService.getParents(bimObject.id.get(), ["groupHasBIMObject"]);
                if (parents.length !== 0) {
                    const isStore = parents.some(parent => parent.name.get() == process.env.groupe_store);
                    if (isStore) return bimObject;
                }
                return null;
            })
        );
        const stores = storeResults.filter((b): b is SpinalNodeRef => b !== null);
        const seenBsoIds = new Set<string>();
        for (const store of stores) {
            const bso = await SpinalGraphService.getChildren(store.id.get(), ["hasBmsEndpoint"]);
            if (bso.length ===0) continue;
            // const bsoID = bso[0].id.get();

            // Avant on prenait le premier trouvé car il y'en avait qu'un dont le nom commence par BSO_GRPB_  
            // Maintenant on prend celui qui commence par SBC car il y'en a 2 et c'est le seul qui commence par SBC
            const correctEndpoint = bso.find(child => child.name.get().startsWith("SBC"))
            if (!correctEndpoint) {
                console.log("No SBC endpoint found for store:", store.name.get());
                continue;
            }
            const bsoID = correctEndpoint.id.get();
            if (seenBsoIds.has(bsoID)) continue;
            seenBsoIds.add(bsoID);
            const bmsEndpoints = await SpinalGraphService.getChildren(bsoID, ["hasBmsEndpoint"]);
            const PositionBSO = bmsEndpoints.find(child => child.name.get() === posBso);
            const PositionLamelle = bmsEndpoints.find(child => child.name.get() === posLamelle);
            if (PositionBSO && PositionLamelle) {
                result.push({ bso: correctEndpoint, posBsoEndpoint: PositionBSO, posLamelleEndpoint: PositionLamelle });
            }
        
        }

        return result;
    } 
    
    

    /**
        * Function that search for the targeted attribute of a node and update it's value 
        * @param  {SpinalNode} endpointNode
        * @param  {any} valueToPush
        * @returns Promise
        */
    public async updateControlValueAttribute(endpointNode: SpinalNode<any>, attributeCategoryName: string | ICategory, attributeName: string, valueToPush: any): Promise<SpinalAttribute | undefined> {
        const attribute = await this._getEndpointControlValue(endpointNode, attributeCategoryName, attributeName)
        if (attribute) {
            attribute.value.set(valueToPush);
            console.log(attributeName+ " of : " + endpointNode.info.path.get() +" ==>  is updated with the value : " + attribute.value);
            return attribute;
        }
        else {
            console.log(valueToPush + " value to push in node : " + endpointNode.info.path.get() + " -- ABORTED !");
        }
    }



    /**
        * Function that search and return the targeted attribute. Creates it if it doesn't exist with a default value of null
        * @param  {SpinalNode} endpointNode
        * @returns Promise
        */
    public async _getEndpointControlValue(endpointNode: SpinalNode<any>, attributeCategoryName: string | ICategory, attributeName: string): Promise<SpinalAttribute> {
        const attribute = await attributeService.findOneAttributeInCategory(endpointNode, attributeCategoryName, attributeName)
        if (attribute != -1) return attribute;

        return attributeService.addAttributeByCategoryName(endpointNode, this.ATTRIBUTE_CATEGORY_NAME, attributeName, this.DEFAULT_COMMAND_VALUE);
    }

    public async BindPositionsToGrpDALI(posList: PositionDataLight[]) {
        for (const item of posList) {
            const { position, CP_light: controlPoint_light,LightEndPoint:endpoint } = item;

            // Vérifier si controlPoint et LightINFO sont valides
            if (controlPoint_light != undefined && endpoint != undefined) {

                console.log("Binding Endpoint:", endpoint.name.get(), "for position", position.name.get());
                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_light.element.load();

                this.processBind.addBind(EndPCurrentValue,
                    // CPmodifDate.bind(async () => {
                    async () => {
                        console.log("EndPoint modified:", endpoint.name.get(), "for position", position.name.get());
                        //await this.bindControlPointCallBack(item);
                        const valueToPush = EndPCurrentValue.get()
                        console.log("Endpoint value for", endpoint.name.get(), ":", valueToPush);
                        cp.currentValue.set(valueToPush)
                        // à voir si'il y a besoin de mettre à jour le directModificationDate
                    

                    })
                // }, false);
            }
        }
    }
    public async BindRoomLight(roomList: RoomDataLight[]) {
         for (const item of roomList) {
            const { room, CP_light: controlPoint_light, LightEndPoint :endpoint } = item;

            if (controlPoint_light != undefined && endpoint != undefined) {
                console.log("Binding Endpoint:", endpoint.name.get(), "for room", room.name.get());
                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_light.element.load();
                this.processBind.addBind(EndPCurrentValue,
                    async () => {
                        console.log("EndPoint modified:", endpoint.name.get(), "for room", room.name.get());
                        const ValueToPush = EndPCurrentValue.get();
                        console.log("Endpoint value for", endpoint.name.get(), ":", ValueToPush);
                        cp.currentValue.set(ValueToPush);

                   

                    })
            }
        }
    }
    public async updateEndpointValue(endpoint: SpinalNodeRef, valueToPush: string) {
        const endpointNode = SpinalGraphService.getRealNode(endpoint.id.get());
        //update controlValue attribute for the endpoint sig_Hauteur
        await this.updateControlValueAttribute(endpointNode, this.ATTRIBUTE_CATEGORY_NAME, this.ATTRIBUTE_NAME, valueToPush);
        endpointNode.info.directModificationDate.set(Date.now());
    }

    public getStoreWithHighestBsoNumber(storeINFO: InfoStore[]): InfoStore | undefined {
        let maxNumber = -1;
        let result: InfoStore | undefined;
        for (const info of storeINFO) {
            const match = info.bso.name.get().match(/\[(\d{1,2})\]/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxNumber) {
                    maxNumber = num;
                    result = info;
                }
            }
        }
        return result;
    }

    public getStoreWithLowestBsoNumber(storeINFO: InfoStore[]): InfoStore | undefined {
        let minNumber = Infinity;
        let result: InfoStore | undefined;
        for (const info of storeINFO) {
            const match = info.bso.name.get().match(/\[(\d{1,2})\]/);
            if (match) {
                const num = parseInt(match[1]);
                if (num < minNumber) {
                    minNumber = num;
                    result = info;
                }
            }
        }
        return result;
    }
    

    public async BindStoresControlPoint(posList: PositionsDataStore[]) {

        for (const item of posList) {
            const { position, CP: controlPoint, CP_Rotation: controlRotationPoint, storeINFO } = item;

            // Vérifier si controlPoint et PosINFO sont valides
            if (controlPoint != undefined && storeINFO.length > 0) {
                   
                    const storeWithLowestBsoNumber = this.getStoreWithLowestBsoNumber(storeINFO);
                    console.log("Binding Endpoint point:", storeWithLowestBsoNumber?.posBsoEndpoint.name.get(), "for position", position.name.get());

                    
                    if (storeWithLowestBsoNumber !== undefined) {
                    const EndpCurrentValue  = (await storeWithLowestBsoNumber.posBsoEndpoint.element.load())?.currentValue;
                    const CPElement = await controlPoint.element.load(); 

                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", storeWithLowestBsoNumber?.posBsoEndpoint.path.get()," for position", position.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point", controlPoint.name.get(), "updated with value", ValueToPush)

                    
                    });
                }
                

            }
        }

    }

    public async BindStoresControlPoint2(posList: PositionsDataStore2[]) {

        for (const item of posList) {
            const { position, CP: controlPoint , CP_Rotation: controlRotationPoint,CP2 : controlPoint2,CP_Rotation2: controlRotationPoint2, storeINFO, doubleControl } = item;

            // Vérifier si controlPoint et PosINFO sont valides
            if (controlPoint2 != undefined && storeINFO.length > 0) {


                    const storeWithHighestBsoNumber = this.getStoreWithHighestBsoNumber(storeINFO);

                    console.log("Binding Endpoint point:", storeWithHighestBsoNumber?.posBsoEndpoint.name.get(), "for position", position.name.get(),"double control point", controlPoint2.name.get());
                     if (storeWithHighestBsoNumber !== undefined) {
                    const EndpCurrentValue  = (await storeWithHighestBsoNumber.posBsoEndpoint.element.load())?.currentValue;
                    const CPElement = await controlPoint2.element.load(); 

                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", storeWithHighestBsoNumber?.posBsoEndpoint.path.get()," for position", position.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point", controlPoint2.name.get(), "updated with value", ValueToPush)

                    
                    });

                    }

            }
        }

    }


    public async BindStoresRotationControlPoint2(posList: PositionsDataStore2[]) {

        for (const item of posList) {
            const { position, CP: controlPoint , CP_Rotation: controlRotationPoint,CP2 : controlPoint2,CP_Rotation2: controlRotationPoint2, storeINFO, doubleControl } = item;

            if (controlRotationPoint2 != undefined && storeINFO.length > 0) {


                    const storeWithHighestBsoNumber = this.getStoreWithHighestBsoNumber(storeINFO);

                    console.log("Binding Endpoint point:", storeWithHighestBsoNumber?.posLamelleEndpoint.name.get(), "for position", position.name.get(),"double blind control point", controlRotationPoint2.name.get());

                    
                    if (storeWithHighestBsoNumber !== undefined) {
                    const EndpCurrentValue  = (await storeWithHighestBsoNumber.posLamelleEndpoint.element.load())?.currentValue;
                    const CPElement = await controlRotationPoint2.element.load(); 

                
                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", storeWithHighestBsoNumber?.posLamelleEndpoint.path.get()," for position", position.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point" , controlRotationPoint2.name.get(),  "updated with value", ValueToPush,)

                    
                    });

                    }

            }
        }

    }

    public async BindBlindControlPointForRoom(RoomList: RoomDataBlind[]) {
        for (const item of RoomList) {
            const { room, CP: controlPoint, CP_Rotation: controlRotationPoint, storeINFO } = item;

            if (controlPoint != undefined && storeINFO.length > 0) {

                for (const info of storeINFO) {

                    console.log("Binding Endpoint point:", info.posBsoEndpoint.name.get(), "for room", room.name.get());


                    const EndpCurrentValue = (await info.posBsoEndpoint.element.load()).currentValue;
                    const CPElement = await controlPoint.element.load();

                  
                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", info.posBsoEndpoint.path.get(), " for room", room.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point", controlPoint.name.get(), "updated with value", ValueToPush)


                    });

                }

            }
        }

    }

    public async BindStoresRotationControlPoint(posList: PositionsDataStore[]) {

        for (const item of posList) {
            const { position, CP: controlPoint, CP_Rotation: controlRotationPoint, storeINFO, doubleControl } = item;

            if (controlRotationPoint != undefined && storeINFO.length > 0) {

              
                    const storeWithLowestBsoNumber = this.getStoreWithLowestBsoNumber(storeINFO);
                    console.log("Binding Endpoint point:", storeWithLowestBsoNumber?.posLamelleEndpoint.name.get(), "for position", position.name.get());
                  
                    if (storeWithLowestBsoNumber !== undefined) {
                        const EndpCurrentValue  = (await storeWithLowestBsoNumber.posLamelleEndpoint.element.load())?.currentValue;
                        const CPElement = await controlRotationPoint.element.load(); 

                   
                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", storeWithLowestBsoNumber.posLamelleEndpoint.path.get()," for position", position.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point", controlRotationPoint.name.get(), "updated with value", ValueToPush)

                    
                    });
                }

                

            }
        }

    }

    public async BindBlindRotationControlPointForRoom(RoomList: RoomDataBlind[]) {

        for (const item of RoomList) {
            const { room, CP: controlPoint, CP_Rotation: controlRotationPoint, storeINFO } = item;

            // Vérifier si controlPoint et PosINFO sont valides
            if (controlRotationPoint != undefined && storeINFO.length > 0) {

                for (const info of storeINFO){

                    console.log("Binding Endpoint point:", info.posLamelleEndpoint.name.get(), "for room", room.name.get());

                    
                    const EndpCurrentValue  = (await info.posLamelleEndpoint.element.load()).currentValue;
                    const CPElement = await controlRotationPoint.element.load(); 

               
                    this.processBind.addBind(EndpCurrentValue, async () => {
                        console.log(" EndPoint modified:", info.posLamelleEndpoint.path.get()," for room", room.name.get());
                        const ValueToPush = EndpCurrentValue.get();
                        CPElement.currentValue.set(ValueToPush);
                        console.log(" control point", controlRotationPoint.name.get(), "updated with value", ValueToPush)

                    
                    });
                    // }, false);

                } 

            }
        }
    }


   

   

    public async getTempEndpoint(positionID: string): Promise<tempObject|undefined> {
        try {
            
             const endpointList = await SpinalGraphService.getChildren(positionID, ["hasBmsEndpoint"]);
             if (endpointList.length === 0) {
                //console.log("No BMS endpoints found for position ID:", positionID);
                return undefined;
            }

            const consignes = endpointList.find(element => element.name.get()=="Consignes")

            if (consignes == undefined){
                return undefined;
            }

            const consEndpoints = await SpinalGraphService.getChildren(consignes.id.get(), ["hasBmsEndpoint"]);
            if (consEndpoints.length === 0) {
                //console.log("No BMS endpoints found in consigne for position ID:", positionID);
                return undefined;
            }
            const endpoint = consEndpoints.find(child => child.name.get() === constants.TempEndpointName);
            const confortEndpoint = consEndpoints.find(child => child.name.get() === constants.TempConfortEndpointName);
            return { DecTempEndpoint: endpoint, ConfortTempEndpoint: confortEndpoint };

        } catch (error) {
            const realposition = SpinalGraphService.getRealNode(positionID);
            console.log(realposition._server_id, "getTempEndpoint ERROR for position", realposition.info.name.get());

        }

    }

    public async getRoomTempEndpoint(roomID: string): Promise<tempObject | undefined> {
        try {
            

             const allEndpoints = await SpinalGraphService.getChildren(roomID, ["hasBmsEndpoint"]);
                if (allEndpoints.length === 0) { 
                    //console.log("No BMS endpoints found for room ID:", roomID);
                    return undefined;
                }
             
             const loc = allEndpoints.find(element=> element.name.get().includes("LOC"))
             
             if (loc == undefined){

                return undefined
             }

             const Tempbsmendpoints = await SpinalGraphService.getChildren(loc.id.get(), ["hasBmsEndpoint"]);
             if(Tempbsmendpoints.length === 0){      
                //console.log("No BMS endpoints found in consigne for room ID:", roomID);
                return undefined;
             } 
             const consignes = Tempbsmendpoints.find(child => child.name.get() === "Consignes");
             if (!consignes) {
                //console.log("No BMS endpoints found for room ID:", roomID);
                return undefined;
            }
            const endpointList = await SpinalGraphService.getChildren(consignes.id.get(), ["hasBmsEndpoint"]);
            if (endpointList.length === 0) {
                //console.log("No BMS endpoints found in consigne for room ID:", roomID);
                return undefined;
            }
            const endpoint = endpointList.find(child => child.name.get() === constants.TempEndpointName);
            const confortEndpoint = endpointList.find(child => child.name.get() === constants.TempConfortEndpointName);
            return { DecTempEndpoint: endpoint, ConfortTempEndpoint: confortEndpoint };

        } catch (error) {
            const realroom = SpinalGraphService.getRealNode(roomID);
            console.log(realroom._server_id, "getRoomTempEndpoint ERROR for room", realroom.info.name.get());

        }

    }
    public async BindTempControlPoint(TempDataList: PositionTempData[]) {

        for (const item of TempDataList) {
            const { position, CP_temp: controlPoint_temp, ConfortTempCP: controlPoint_confort, TempEndpoints: tempEndpoints } = item;
            //console.log(TempEndpoint, "TempEndpoint for position", position.name.get());


            if (controlPoint_temp != undefined && tempEndpoints?.DecTempEndpoint != undefined) {
                const endpoint = tempEndpoints.DecTempEndpoint;
                console.log("Binding Temperature Endpoint:", endpoint.name.get(), "for position", position.name.get());

                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_temp.element.load();
                this.processBind.addBind(EndPCurrentValue, async () => {
                    console.log("EndPoint modified:", endpoint.name.get() ,"for position", position.name.get());
                    const ValueToPush = EndPCurrentValue.get();
                    cp.currentValue.set(ValueToPush);
                    console.log("Temperature controPoint updated for position", position.name.get());
                });
                // }, false);
            }
        }
    }

    public async BindConfortTempControlPoint(TempDataList: PositionTempData[]) {

        for (const item of TempDataList) {
            const { position, CP_temp: controlPoint_temp, ConfortTempCP: controlPoint_confort, TempEndpoints: tempEndpoints } = item;
            //console.log(TempEndpoint, "TempEndpoint for position", position.name.get());


            if (controlPoint_confort != undefined && tempEndpoints?.ConfortTempEndpoint != undefined) {
                const endpoint = tempEndpoints.ConfortTempEndpoint;
                console.log("Binding Temperature Endpoint:", endpoint.name.get(), "for position", position.name.get());

                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_confort.element.load();
                this.processBind.addBind(EndPCurrentValue, async () => {
                    console.log("EndPoint modified:", endpoint.name.get() ,"for position", position.name.get());
                    const ValueToPush = EndPCurrentValue.get();
                    cp.currentValue.set(ValueToPush);
                    console.log("Temperature controPoint updated for position", position.name.get());
                });
                // }, false);
            }
        }
    }

    public async BindRoomTempControlPoint(TempDataList: RoomTempData[]) {

        for (const item of TempDataList) {
            const { room, CP_temp: controlPoint_temp, ConfortTempCP: controlPoint_confort, TempEndpoints: tempEndpoints } = item;
            //console.log(TempEndpoint, "TempEndpoint for room", room.name.get());


            if (controlPoint_temp != undefined && tempEndpoints?.DecTempEndpoint != undefined) {
                const endpoint = tempEndpoints.DecTempEndpoint;
                console.log("Binding Temperature endpoint point:", controlPoint_temp.name.get(), "for room", room.name.get());

                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_temp.element.load();

                this.processBind.addBind(EndPCurrentValue, async () => {
                    console.log("EndPoint modified:", endpoint.name.get() ,"for room", room.name.get());
                    const ValueToPush = EndPCurrentValue.get();
                    cp.currentValue.set(ValueToPush);
                    console.log("Temperature controPoint updated for room", room.name.get());

                });
                // }, false);
            }
        }
    }

    public async BindRoomConfortTempControlPoint(TempDataList: RoomTempData[]) {

        for (const item of TempDataList) {
            const { room, CP_temp: controlPoint_temp, ConfortTempCP: controlPoint_confort, TempEndpoints: tempEndpoints } = item;
            //console.log(TempEndpoint, "TempEndpoint for room", room.name.get());


            if (controlPoint_confort != undefined && tempEndpoints?.ConfortTempEndpoint != undefined) {
                const endpoint = tempEndpoints.ConfortTempEndpoint;
                console.log("Binding Temperature endpoint point:", controlPoint_confort.name.get(), "for room", room.name.get());

                const EndPCurrentValue = (await endpoint.element.load()).currentValue;
                const cp = await controlPoint_confort.element.load();

                this.processBind.addBind(EndPCurrentValue, async () => {
                    console.log("EndPoint modified:", endpoint.name.get() ,"for room", room.name.get());
                    const ValueToPush = EndPCurrentValue.get();
                    cp.currentValue.set(ValueToPush);
                    console.log("Temperature controPoint updated for room", room.name.get());

                });
                // }, false);
            }
        }
    }

}