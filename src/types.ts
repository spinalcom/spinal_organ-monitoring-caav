import { SpinalNodeRef } from "spinal-env-viewer-graph-service";


export type PositionDataLight = {
    position: SpinalNodeRef;
    CP_light: SpinalNodeRef | undefined;
    LightEndPoint: SpinalNodeRef;
};

export type RoomDataLight = {
    room: SpinalNodeRef;
    CP_light: SpinalNodeRef | undefined;
    LightEndPoint: SpinalNodeRef;
};
export type RoomDataBlind = {
    room: SpinalNodeRef;
    CP: SpinalNodeRef | undefined;
    CP_Rotation: SpinalNodeRef | undefined;
    storeINFO: InfoStore[];
};
export type PositionsDataStore={
    position: SpinalNodeRef;
    CP: SpinalNodeRef | undefined;
    CP_Rotation: SpinalNodeRef | undefined;
    storeINFO: InfoStore[];
    doubleControl : boolean;
}
export type PositionsDataStore2={
    position: SpinalNodeRef;
    CP: SpinalNodeRef | undefined;
    CP_Rotation: SpinalNodeRef | undefined;
    CP2: SpinalNodeRef | undefined;
    CP_Rotation2: SpinalNodeRef | undefined;
    storeINFO: InfoStore[];
    doubleControl : boolean;

}
export type InfoStore={
    bso: SpinalNodeRef;
    grpb: SpinalNodeRef | undefined;
    posBsoEndpoint: SpinalNodeRef;
    posLamelleEndpoint: SpinalNodeRef;
}
export type PositionTempData={
    position: SpinalNodeRef;
    CP_temp : SpinalNodeRef | undefined;
    ConfortTempCP: SpinalNodeRef | undefined;
    TempEndpoints: tempObject | undefined;
}
export type tempObject={    
    DecTempEndpoint: SpinalNodeRef | undefined;
    ConfortTempEndpoint: SpinalNodeRef | undefined;
}
export type RoomTempData={
    room: SpinalNodeRef;
    CP_temp : SpinalNodeRef | undefined;
    ConfortTempCP: SpinalNodeRef | undefined;
    TempEndpoints: tempObject | undefined;
}

export type RoomData = {
    room: SpinalNodeRef;
    CP: SpinalNodeRef | undefined;
    endpointList: SpinalNodeRef[];
};