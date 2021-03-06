/**
 * DataLoader
 * ----------
 *
 * Class in charge of parsing and loading the data from Packet Dapper.
 **/

import {PDDataInterface} from "./data";

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface DataLoaderInterface {
  readonly Name: string;
  ParseFile(file_content: string) : PDDataInterface;
}

export {DataLoaderInterface};
export default DataLoaderInterface;
