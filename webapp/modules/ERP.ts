import Filter from "sap/ui/model/Filter";
import ODataModel from "sap/ui/model/odata/v2/ODataModel";

type ODataResponse = {
    data: any,
    response: any
}

type ODataParameter = {
    bParam: boolean,
    oParameter: any | undefined
}

type ODataKeysEntityEndPoint = {
    [key: string]: string | number
}

type HTTPMethod = "GET" | "POST" | "PUT" | "DELETE";

type MessageContainer = {
    type: string,
    messages: Array<string>
}

export default class ERP {
    
    static getDataERP(
        _sEntity: string, 
        _oService: ODataModel, 
        _aFilter: Filter[] | undefined,
        _oParam: Record<string, string> = {}
    ) : Promise<ODataResponse> {
        return new Promise <ODataResponse> ((resolve,reject)=>{
            _oService.read(_sEntity, {
                filters: _aFilter,
                urlParameters: _oParam,
                success: (data: any, response: any) => resolve({data,response}),
                error: reject
            });
        });
    }

    static generateEntityWithKeys (_sEntity: string, _oKeysEntityEndPoint: ODataKeysEntityEndPoint): string {
        let sUrlEntityKeys = [...Object.entries(_oKeysEntityEndPoint)]
            .map(([key, val]) => {
                if (typeof val === "number")
                    return `${key}=${val}`;
                return `${key}='${val}'`;
            }).join(",");
        return `${_sEntity}(${sUrlEntityKeys})`;
    };

    static readDataKeysERP (
        _sEntity: string, 
        _oService: ODataModel,
        _oParam: Record<string, string> = {}
    ): Promise<ODataResponse> {
        return new Promise <ODataResponse> ((resolve, reject) => {
            _oService.read(_sEntity,{
                urlParameters: _oParam,
                success: (data: any, response: any) => resolve({data,response}),
                error: reject
            });
        });
    };
}


// declare module "com/triiari/retrobilling/modules/ERP" {
//     export async function createDataERP (_sEntity: string, _oService: ODataModel, _oDataToSend: Object | Array<any>): Promise<ODataResponse>;
//     export async function functionImport (_oService: ODataModel, _sEntity: string, _sMethod: HTTPMethod, _JSONUrlParameters: any): Promise<ODataResponse.response>;
//     export async function deleteDataERP (_sEntity: string, _oService: ODataModel): Promise<ODataResponse>;
//     export function extractMessageContainer (oResponse: ODataResponse.response): MessageContainer;
// }