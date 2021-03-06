/**************************************************************************
 * INTERFACE
 **************************************************************************/

interface PDEntryInterface {
  readonly SourceIndex: number;
  readonly Value: number;
  readonly Missing: boolean;
}

interface PDMatchInterface {
  readonly Sender: boolean;
  readonly InOrder: boolean;
  readonly TcpFlag: string;
  readonly Entries: Array<PDEntryInterface>;
}

interface PDDataInterface {
  readonly Valid: boolean;
  readonly Count: number;
  readonly TsBase: Array<number>;
  readonly Names: Array<string>;
  readonly Matches: Array<PDMatchInterface>;
  Dirty: boolean;

  Offsets: Array<number>;
}


/**************************************************************************
 * IMPLEMENTATION
 **************************************************************************/

class PDEntry implements PDEntryInterface {
  constructor(source_index: number, value: number) {
    this._source_index = source_index;
    this._value = value;
  }


  get SourceIndex() : number { return this._source_index; }
  get Value() : number { return this._value; }
  get Missing() : boolean {
    return this._value < 0;
  }

  private _source_index: number;
  private _value: number;

}

class PDMatch implements PDMatchInterface {
  constructor() {
    this._entries = new Array<PDEntryInterface>();
  }

  get Sender() : boolean { return this._sender; }
  set Sender(sender : boolean) { this._sender = sender; }
  get InOrder() : boolean { return this._in_order; }
  set InOrder(in_order : boolean) { this._in_order = in_order; }
  get TcpFlag() : string { return this._tcp_flag; }
  set TcpFlag(tcp_flag: string) { this._tcp_flag = tcp_flag; }
  get Entries() : Array<PDEntryInterface> {
    return this._entries;
  }

  private _sender: boolean;
  private _in_order: boolean;
  private _tcp_flag: string;
  private _entries: Array<PDEntryInterface>;
}

class PDData implements PDDataInterface {
  /*******************************************************
   * CONSTRUCTOR
   *******************************************************/
  constructor() {
    this._ts_base = new Array<number>();
    this._offsets = new Array<number>();
    this._matches = new Array<PDMatchInterface>();
    this._names = new Array<string>();
    this._dirty = false;
    this._valid = false;
  }

  /*******************************************************
   * PUBLIC INTERFACE
   *******************************************************/

  get Valid() : boolean { return this._valid; }
  get Count() : number { return this._matches.length; }
  get TsBase() : Array<number> { return this._ts_base; }
  get Offsets() : Array<number> { return this._offsets; }
  get Matches() : Array<PDMatchInterface> { return this._matches; }
  get Names() : Array<string> { return this._names; }
  get Dirty() : boolean { return this._dirty; }

  set Valid(valid: boolean) { this._valid = valid; }
  set Offsets(offsets: Array<number>) {
    this._offsets = offsets;
    this.Dirty = true;
  }
  set Dirty(dirty: boolean) { this._dirty = dirty; }

  /*******************************************************
   * PRIVATE DATA
   *******************************************************/

  private _valid: boolean;
  private _matches: Array<PDMatchInterface>;
  private _ts_base: Array<number>;
  private _offsets: Array<number>;
  private _names: Array<string>;
  private _dirty: boolean;
}

export {PDEntry, PDEntryInterface};
export {PDMatch, PDMatchInterface};
export {PDData, PDDataInterface};
