/* eslint-disable @typescript-eslint/no-redundant-type-constituents */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { ref } from 'vue';
import type { IDestructibleAssociated } from './SlapTypes';

export class Destructibles {
  private static regObj = new FinalizationRegistry<string>((key: string) => {
    const keyObj = this.keyMap.get(key);
    //console.log(`Un objeto con clave: ${key} se ha sido destruido`);
    if (keyObj) {
      const { referrers } = keyObj;
      const newReferrers = referrers.filter((e) => e.deref() !== undefined);
      if (newReferrers.length > 0) {
        keyObj.referrers = newReferrers;
        //console.log(`La clave: ${key} permanece con ${newList.length} referencias`);
      } else {
        this.keyMap.delete(key);
        //console.log(`La clave: ${key} ya no tiene referencias se elimina`);
      }
    }
  });
  private static keyMap = new Map<string, IDestructibleAssociated>();
  private static register(obj: Destructibles, objAssociated: any = null): any {
    const reference = new WeakRef(obj);
    this.regObj.register(obj, obj._iternalKey, obj);
    const keyObj = this.keyMap.get(obj._iternalKey);
    if (keyObj) //Pregunta si la clave existe
    {
      keyObj.referrers.push(reference);
      if (keyObj.associatedData) {
        keyObj.associatedData.value = objAssociated;
      } else {
        keyObj.associatedData = ref(objAssociated);
      }
    } else {
      this.keyMap.set(obj._iternalKey, {
        associatedData: ref(objAssociated),
        referrers: [reference],
      });
    }
  }
  private static unregister(obj: Destructibles): any | undefined {
    const keyObj = this.keyMap.get(obj._iternalKey);
    if (keyObj) {
      const { referrers } = keyObj;
      const newReferrers = referrers.filter((e) => e.deref() !== undefined && e.deref() !== obj);
      keyObj.referrers = newReferrers;
      return keyObj.associatedData.value;
    }
  }
  public static getRefAssociatedData(key: string): any | undefined {
    const keyObj = this.keyMap.get(key);
    if (keyObj) {
      if (keyObj.associatedData) {
        return keyObj.associatedData;
      }
    }
  }
  public static getAssociatedData(key: string): any | undefined {
    const refData = this.getRefAssociatedData(key);
    if (refData) {
      return refData.value;
    }
  }
  public static setAssociatedData(key: string, newVal: any) {
    const keyObj = this.keyMap.get(key);
    if (keyObj) {
      if (keyObj.associatedData && newVal) {
        keyObj.associatedData.value = newVal;
      }
    }
  }

  public static getKeyReferrers(key: string): Destructibles[] | undefined {
    const keyObj = this.keyMap.get(key);
    if (keyObj) {
      const { referrers } = keyObj;
      const resReferrers: Destructibles[] = [];
      for (const e of referrers) {
        const obj = e.deref();
        if (obj) {
          resReferrers.push(obj);
        }
      }
      return resReferrers;
    }
  }
  private _iternalKey!: string;
  protected get internalKey() {
    return this._iternalKey;
  }
  protected set internalKey(newVal: string) {
    if (newVal !== this._iternalKey) {
      let associatedObject: any;
      if (this._iternalKey) {
        associatedObject = this.staticSelf.unregister(this);
      }
      this._iternalKey = newVal;
      this.staticSelf.register(this, associatedObject); //Cuando cambia la clave desregistra y reregista en la nueva clave
    }
  }
  protected get associatedData(): any {
    return this.staticSelf.getAssociatedData(this._iternalKey);
  }
  protected set associatedData(newVal: any) {
    this.staticSelf.setAssociatedData(this._iternalKey, newVal);
  }
  public get refAssociatedData() {
    return this.staticSelf.getRefAssociatedData(this._iternalKey);
  }
  protected get staticSelf() {
    return this.constructor as typeof Destructibles;
  }
  constructor(key: any = null) {
    this.internalKey = key ? key : crypto.randomUUID();
  }
  initializeMyData(data: any) {
    if (data) {
      this.associatedData = data;
    }
  }
}
