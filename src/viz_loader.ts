/**
 * VizLoader
 * ---------
 *
 * Class in charge of parsing and loading the data from Packet Dapper.
 * This loader loads the text file format compatible with the
 * LabView Visualizer
 **/

/**
 * NOTE(donosoc): This class does the *stupidest* parsing of the
 *                file by looking for a particular line per loop,
 *                instead of looking them at a time.
 *                This is because some data is needed before-hand
 *                and because eventually the format will be sane
 *                enough to have a header with all the necessary
 *                metadata instead of having to search for particular
 *                lines within a text file.
 **/

import {PDEntry} from "./data";
import {PDMatch} from "./data";
import {PDData, PDDataInterface} from "./data";
import DataLoaderInterface from "./data_loader_interface";

/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class VizLoader implements DataLoaderInterface {
  get Name() : string {
    return "VizLoader";
  }

  private static ThrowError(line_num: number,
    fmt: string, ...args: any[]) : void {
    console.error("Error parsing in line: %f", line_num);
    console.error(fmt, ...args);
    throw "Error parsing file. Aborting.";
  }

  ParseFile(file_content: string) : PDDataInterface {
    let data = new PDData();

    let lines = file_content.split("\n");
    console.info("Read %d lines", lines.length);

    VizLoader._ParseTsBase(lines, data);
    VizLoader._ParseNames(lines, data);
    VizLoader._ParseOffsets(lines, data);
    VizLoader._ParseEntries(lines, data);

    data.Valid = true;
    return data;
  }


  private static _ParseTsBase(lines: Array<string>, data: PDData) : void {
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];
      if (line.lastIndexOf("TSBASE", 0) == 0) {
        console.log(`FOUND TSBASE LINE: \"${line}\"`);
        let line_split = line.split(" ");

        for (let i = 1; i < line_split.length; i++) {
          let str_res = line_split[i];
          if (str_res.length == 0) {
            continue;
          }
          let res = parseFloat(str_res);
          if (isNaN(res)) {
            VizLoader.ThrowError(line_index + 1,
              "Invalid format in TSBASE line: %s", line);
          }

          data.TsBase.push(res);
        }

        console.log("TSBASE: ", data.TsBase);
        return;
      }
    }

    VizLoader.ThrowError(-1, "Cannot find TSBASE line.");
  }

  private static _ParseNames(lines: Array<string>, data: PDData) : void {
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];

      if (line.lastIndexOf("NAMES", 0) == 0) {
        let split = line.split(" ");
        if (split.length != data.TsBase.length + 1) {
          VizLoader.ThrowError(line_index + 1,
                                "Wrong amount of names specified: %s", line);
        }

        for (let i = 1; i < split.length; i++) {
          data.Names.push(split[i]);
        }

        return;

      }
    }

    console.warn("Could not find NAMES line. Creating default graph names");
    for (let i = 0; i < data.TsBase.length; i++) {
      let name = `Graph ${i}`;
      data.Names.push(name);
    }
  }

  private static _ParseOffsets(lines: Array<string>,  data: PDData) : void {
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];

      if (line.lastIndexOf("OFFST", 0) == 0) {
        console.log(`FOUND OFFST LINE: \"${line}\"`);
        let line_split = line.split(" ");
        for (let i = 1; i < line_split.length; i++) {
          let str_res = line_split[i];
          if (str_res.length == 0) {
            continue;
          }
          let res = parseFloat(str_res);
          if (isNaN(res)) {
            VizLoader.ThrowError(line_index + 1,
              "Invalid format in OFFST line: %s", line);
          }

          data.Offsets.push(res);
        }

        return;
      }
    }

    console.warn("Could not find OFFST line. Creating zeroes");
    for (let i = 0; i < data.TsBase.length; i++) {
      data.Offsets.push(0);
    }
  }


  private static _ParseEntries(lines: Array<string>, data: PDData) : void {
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];

      if (line.length == 0) {
        continue;
      }

      // We skip the TSBASE and OFFST lines
      if (line.lastIndexOf("TSBASE", 0) == 0) {
        continue;
      }
      if (line.lastIndexOf("OFFST", 0) == 0) {
        continue;
      }
      if (line.lastIndexOf("NAMES", 0) == 0) {
        continue;
      }

      let split = line.split(" ");
      let time_strings = split.slice(3, split.length);

      if (time_strings.length != data.TsBase.length) {
        VizLoader.ThrowError(line_index + 1,
                              "Entry doesn't have same amount of times as TSBASE: %s",
                              line);
      }

      // We create the entry
      let match = VizLoader._CreateMatch(time_strings, line_index, line);
      data.Matches.push(match);
    }
  }

  private static _CreateMatch(time_strings: string[],
                              line_index: number,
                              line: string) : PDMatch {
    // We create the entry
    let match = new PDMatch();

    // We parse the timings
    time_strings.forEach(function(str: string, i: number) : void {
      let value = parseFloat(str);
      if (value == NaN) {
        VizLoader.ThrowError(line_index + 1,
                              "Cannot parse time in line: %s", line);
      }

      let entry = new PDEntry(i, value);
      match.Entries.push(entry);
    });

    return match;
  }
}


export {VizLoader}
export default VizLoader;
