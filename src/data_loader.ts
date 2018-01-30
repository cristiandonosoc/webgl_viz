/**
 * DataLoader
 * ----------
 *
 * Class in charge of parsing and loading the data from Packet Dapper.
 **/

/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface PDEntryInterface {
  readonly Data: Array<number>;
}

interface PDDataInterface {
  readonly Valid: boolean;
  readonly Count: number;
  readonly TsBase: Array<number>;
  readonly Offsets: Array<number>;
  readonly Names: Array<string>;

  readonly Entries: Array<PDEntryInterface>;
}

interface DataLoaderInterface {
  ParseFile(filename: string, file_content: string) : PDDataInterface;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class PDEntry implements PDEntryInterface {
  constructor() {
    this._data = new Array<number>();

  }


  get Data() : Array<number> { return this._data; }

  private _data: Array<number>;
}

class PDData implements PDDataInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/
  constructor() {
    this._ts_base = new Array<number>();
    this._offsets = new Array<number>();
    this._entries = new Array<PDEntry>();
    this._names = new Array<string>();
    this._valid = false;
  }

  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  get Valid() : boolean { return this._valid; }
  set Valid(valid: boolean) { this._valid = valid; }

  get Count() : number { return this._entries.length; }
  get TsBase() : Array<number> { return this._ts_base; }
  get Offsets() : Array<number> { return this._offsets; }

  get Entries() : Array<PDEntryInterface> {
    return this._entries;
  }

  get Names() : Array<string> { return this._names; }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _valid: boolean;
  private _entries: Array<PDEntry>;
  private _ts_base: Array<number>;
  private _offsets: Array<number>;
  private _names: Array<string>;
}

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
class DataLoader implements DataLoaderInterface {
  private static ThrowError(line_num: number,
    fmt: string, ...args: any[]) : void {
    console.error("Error parsing in line: %f", line_num);
    console.error(fmt, ...args);
    throw "Error parsing file. Aborting.";
  }

  ParseFile(filename: string, file_content: string) : PDDataInterface {
    let data = new PDData();

    let lines = file_content.split("\n");
    console.info("Read %d lines", lines.length);

    this._ParseTsBase(lines, data);
    this._ParseNames(lines, data);
    this._ParseEntries(lines, data);

    data.Valid = true;
    return data;
  }


  private _ParseTsBase(lines: Array<string>, data: PDData) : void {
    let found = false;
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];
      if (line.lastIndexOf("TSBASE", 0) == 0) {
        let line_split = line.split(" ");

        for (let i = 1; i < line_split.length; i++) {
          let res = parseFloat(line_split[i]);
          if (res == NaN) {
            DataLoader.ThrowError(line_index + 1,
              "Invalid format in TSBASE line: %s", line);
          }

          data.TsBase.push(res);
        }
        found = true;
      }
    }

    if (!found) {
      DataLoader.ThrowError(-1, "Cannot find TSBASE line.");
    }
  }

  private _ParseNames(lines: Array<string>, data: PDData) : void {
    let found = false;
    for (let line_index = 0;
         line_index < lines.length;
         line_index++) {
      let line = lines[line_index];

      if (line.lastIndexOf("NAMES", 0) == 0) {
        let split = line.split(" ");
        if (split.length != data.TsBase.length + 1) {
          DataLoader.ThrowError(line_index + 1,
                                "Wrong amount of names specified: %s", line);
        }

        for (let i = 1; i < split.length; i++) {
          data.Names.push(split[i]);
        }

        found = true;
      }
    }

    if (!found) {
      for (let i = 0; i < data.TsBase.length; i++) {
        let name = `Graph ${i}`;
        data.Names.push(name);
      }
    }
  }

  private _ParseEntries(lines: Array<string>, data: PDData) : void {
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
        DataLoader.ThrowError(line_index + 1,
                              "Entry doesn't have same amount of times as TSBASE: %s",
                              line);
      }

      // We create the entry
      let entry = new PDEntry();
      // We parse the timings
      time_strings.forEach(function(str:string) : void {
        let p = parseFloat(str);
        if (p == NaN) {
          DataLoader.ThrowError(line_index + 1,
                                "Cannot parse time in line: %s", line);
        }
        // We add it
        entry.Data.push(p);
      });
    }
  }
}


export {PDData, PDDataInterface}
export {PDEntry, PDEntryInterface}
export {DataLoader, DataLoaderInterface}

