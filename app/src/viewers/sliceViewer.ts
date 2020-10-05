// import {BufferAttribute} from "three";
//
// // eslint-disable-next-line import/no-unresolved
// import {AVConstants} from "../constants"
//
// // eslint-disable-next-line import/no-unresolved
// import {Epoch, PenetrationData, SliceData} from "../models/apiModels";
//
// // eslint-disable-next-line import/no-unresolved
// import {BaseViewer} from "./baseViewer";
// import {SliceType} from "../models/enums";
//
// // eslint-disable-next-line @typescript-eslint/no-var-requires
// const THREE = require("three");
//
// export class SliceViewer extends BaseViewer {
//
//     constructor(constants: AVConstants, epochs: Epoch[], sliceData: SliceData) {
//         super(constants, epochs);
//
//         this.cameraPosition = [0, 0, -15000];
//         this.sliceData = sliceData;
//     }
//
//     public loadPenetration(penetrationData: PenetrationData): void {
//         super.loadPenetration(penetrationData);
//         const penetrationId = penetrationData.penetrationId;
//         const penetration = this.penetrationPointsMap.get(penetrationId);
//         const geometry = penetration.geometry;
//         const position3 = geometry.getAttribute("position").array;
//         const position2 = new Float32Array(position3.length);
//         switch (this.sliceType) {
//             case SliceType.CORONAL:
//                 for (let i = 0; i < position3.length; i += 3) {
//                     position2[i] = position3[i + 2]; // swap out x and z
//                     position2[i + 1] = position3[i + 1];
//                     position2[i + 2] = this.constants.CoronalMax / 2;
//                 }
//                 break;
//             case SliceType.SAGITTAL:
//                 for (let i = 0; i < position3.length; i += 3) {
//                     position2[i] = position3[i];
//                     position2[i + 1] = position3[i + 1];
//                     position2[i + 2] = this.constants.SagittalMax / 2; // x and y map correctly
//                 }
//                 break;
//         }
//         geometry.attributes.position = new THREE.Float32BufferAttribute(position2, 3);
//         (geometry.attributes.position as BufferAttribute).needsUpdate = true;
//     }
//
//     public initialize(): void {
//         super.initialize();
//         this.initSlice();
//
//         this.orbitControls.enableRotate = false;
//     }
// }
