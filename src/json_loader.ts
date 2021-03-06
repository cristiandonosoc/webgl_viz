/**
 * JsonLoader
 * ----------
 *
 * Class in charge of parsing the packet dapper data exported by the web
 * printer
 **/

import {PDEntry} from "./data";
import {PDMatch} from "./data";
import {PDData, PDDataInterface} from "./data";
import DataLoaderInterface from "./data_loader_interface";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class JsonLoader implements DataLoaderInterface {
  get Name() : string {
    return "JsonLoader";
  }

  private static _GetElementByKey(json: any,
                                  key: string,
                                  will_throw : boolean = true) : any {
    let elem = json[key];
    if (will_throw && elem == undefined) {
      console.error("ELEM: ", json);
      throw `Undefined key ${key} in json element`;
    }

    return elem;
  }

  ParseFile(content: string) : PDDataInterface {
    // We parse the data
    let json;
    try {
      json = JSON.parse(content);
    }
    catch(e) {
      console.error(e);
      return new PDData();
    }

    let data = new PDData();

    // We load the data
    if (!JsonLoader._LoadTsBase(json, data))  { return data; }
    if (!JsonLoader._LoadNames(json, data))   { return data; }
    if (!JsonLoader._LoadOffsets(json, data)) { return data; }
    if (!JsonLoader._LoadMatches(json, data)) { return data; }

    data.Valid = true;
    return data;
  }

  private static _LoadTsBase(json: any, data: PDData) : boolean {
    let key = "tsbases";
    let tsbases = JsonLoader._GetElementByKey(json, key);
    for (let tsbase of tsbases) {
      data.TsBase.push(tsbase);
    }

    return true;
  }

  private static _LoadNames(json: any, data: PDData) : boolean {
    let key = "names";
    if (!(key in json)) {
      console.warn("Loaded file doesn't have \"names\" key. Creating placeholder names.");

      for (let i = 0; i < data.TsBase.length; i++) {
        let name = `Pcap ${i}`;
        data.Names.push(name);
      }

      return true;
    }

    let names = json[key];
    if (names.length != data.TsBase.length) {
      throw `Names length (${names.length}) != tsbases length (${data.TsBase.length})`;
    }
    for (let name of names) {
      data.Names.push(names);
    }

    return true;
  }

  private static _LoadOffsets(json: any, data: PDData) : boolean {
    let key = "offsets";
    if (!(key in json)) {
      console.warn("Loaded file doesn't have \"offsets\" key. Adding zeroes.");

      for (let i = 0; i < data.TsBase.length; i++) {
        data.Offsets.push(0);
      }
      return true;
    }

    let offsets = <Array<number>> json[key];
    if (offsets.length != data.TsBase.length) {
      throw `Offset length (${offsets.length}) != tsbases length (${data.TsBase.length})`;
    }

    for (let offset of offsets) {
      data.Offsets.push(offset);
    }

    return true;
  }

  private static _LoadMatches(json: any, data: PDData) : boolean {
    let matches = JsonLoader._GetElementByKey(json, "matches");
    for (let loaded_match of matches) {
      let match = new PDMatch();
      match.Sender = JsonLoader._GetElementByKey(loaded_match, "sender");
      match.InOrder = JsonLoader._GetElementByKey(loaded_match, "in_order");
      match.TcpFlag = JsonLoader._GetElementByKey(loaded_match, "tcp_flag");

      let loaded_entries = JsonLoader._GetElementByKey(loaded_match, "entries");
      if (loaded_entries.length != data.TsBase.length) {
        throw `Entry with different length than tsbase: ${loaded_entries.length} vs ${data.TsBase.length}`;
      }
      for (let loaded_entry of loaded_entries) {
        let index = JsonLoader._GetElementByKey(loaded_entry, "libpcap_index");
        let value = JsonLoader._GetElementByKey(loaded_entry, "value");
        let entry = new PDEntry(index, value);

        match.Entries.push(entry);
      }

      data.Matches.push(match);
    }

    return true;
  }
}

export {JsonLoader};
export default JsonLoader;
