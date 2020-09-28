import { Component, ApplicationRef } from "@angular/core";
import { NavController } from "ionic-angular";
import { Platform } from "ionic-angular/platform/platform";
import { AppVersion } from "@ionic-native/app-version";
import { DriverInterfacePage } from "../driverInterface/driverInterface";
import { RobotInterfacePage } from "../robotInterface/robotInterface";
import { Storage } from "@ionic/storage";
import { Device } from "@ionic-native/device";
import { ScreenOrientation } from "@ionic-native/screen-orientation";
import { Network } from "@ionic-native/network";
import { LocationAccuracy } from "@ionic-native/location-accuracy";
import { Diagnostic } from "@ionic-native/diagnostic";
import { BLE } from "@ionic-native/ble";

import encoding from "text-encoding";

import Parse from "parse";
// import { createDeflateRaw } from "zlib";
// import { rejects } from "assert";
// import { JitSummaryResolver } from "@angular/compiler";
// declare let cordova: any;

@Component({
  selector: "page-home",
  templateUrl: "home.html"
})
export class HomePage {
  appVersionString: string;
  recentConnectedRobots: any[] = [];
  robotName: string;
  storedName: string = undefined;
  clearNamePressedOnce: boolean = false;
  invalidRobotName: string = undefined;
  objectKeys: any = Object.keys; ///Weird hack to call this function from template:-P
  hardwareCheckInterval: any = null;
  bluetoothEnabled: boolean = false;
  locationEnabled: boolean = false;
  wifiEnabled: boolean = true;
  internetAvailable: boolean = true;
  signedIn: boolean = false;

  get readyToEnterRobotInterface() {
    return (
      this.internetAvailable &&
      this.locationEnabled &&
      this.signedIn &&
      this.robotName &&
      this.bluetoothEnabled &&
      this.invalidRobotName !== this.robotName
    );
  }

  get readyToCreateRobotName() {
    return (
      this.internetAvailable &&
      this.locationEnabled &&
      this.signedIn &&
      !this.storedName &&
      // !this.robotName &&
      this.bluetoothEnabled
      // &&
      // this.invalidRobotName !== this.robotName
    );
  }

  constructor(
    private navCtrl: NavController,
    private ble: BLE,
    private diagnostic: Diagnostic,
    private appVersion: AppVersion,
    private locationAccuracy: LocationAccuracy,
    private network: Network,
    private plt: Platform,
    private storage: Storage,
    private device: Device,
    private screenOrientation: ScreenOrientation
  ) {
    console.log(`serverurl: ${process.env.BACKEND_SERVER}`);
    console.log(`parse app id: ${process.env.PARSE_APP_ID}`);

    Parse.serverURL = 'http://' + process.env.BACKEND_SERVER + ':1337/parse';
    // Parse.serverURL = "https://parseapi.back4app.com"; // This is your Server URL
    Parse.initialize(process.env.PARSE_APP_ID);
    // Parse.initialize(
    //   "chRsGURCGEV4h0Z96Je8NxALdUxT8JlsKGy9QgoO", // This is your Application ID
    //   "Px5si9ZvH72s5Jphxrc84aMcetSY5LhPgm2Swy8M" // This is your Javascript key
    // );
  }

  ionViewWillEnter() {
    // console.log("this.plt.is('cordova'):  " + this.plt.is("cordova"));
    if (this.plt.is("cordova")) {
      this.clearOldNamesFromParse().then(
        () => this.connectRobotToParse(),
        () => this.connectRobotToParse()
      );

      // TODO: Should we perhaps aaaalways use landscape??
      this.screenOrientation.lock(this.screenOrientation.ORIENTATIONS.PORTRAIT);
      this.appVersion.getVersionNumber().then(
        versionNumber => {
          this.appVersionString = versionNumber;
        },
        err => console.error(err)
      );

      this.hardwareCheckInterval = setInterval(() => {
        this.checkWifiAvailable();
        this.checkLocationEnabled();
        this.ble
          .isEnabled()
          .then(() => (this.bluetoothEnabled = true))
          .catch(() => (this.bluetoothEnabled = false));
      }, 1000);
      this.attachInternetConnectionListeners();
    } else {
      this.storage.ready().then(() => {
        this.storage
          .get("recent-connected-robots")
          .then(robots => {
            if (robots === null) {
              console.log("key not found in storage: recent-connected-robots");
            } else {
              let parsedRobots = JSON.parse(robots);
              console.log(`got robot list from storage:`);
              console.log(robots);
              parsedRobots.sort((a, b) => {
                return a.date < b.date ? 1 : -1;
              });
              this.recentConnectedRobots = parsedRobots;
            }
          })
          .catch(err => {
            console.log(err);
          });
      });
    }
  }

  ionViewWillLeave() {
    if (this.hardwareCheckInterval) {
      clearInterval(this.hardwareCheckInterval);
    }
  }

  checkLocationEnabled() {
    this.diagnostic
      .isLocationEnabled()
      .then((enabled: any) => {
        console.log("Location is " + (enabled ? "enabled" : "not enabled"));
        this.locationEnabled = enabled;
      })
      .catch((error: any) => {
        console.error("Error while checking location: " + error);
      });
  }

  checkWifiAvailable() {
    this.diagnostic
      .isWifiAvailable()
      .then((available: any) => {
        // console.log("WiFi is " + (available ? "available" : "not available"));
        this.wifiEnabled = available;
      })
      .catch((error: any) => {
        console.error("Error while checking wifi: " + error);
      });
  }

  enableWifi() {
    this.diagnostic
      .setWifiState(true)
      .then(msg => console.log(msg))
      .catch(err => console.log(err));
  }

  enableLocation() {
    this.diagnostic.requestLocationAuthorization().then(() => {
      this.locationAccuracy.canRequest().then((canRequest: boolean) => {
        if (canRequest) {
          this.locationAccuracy.request(
            this.locationAccuracy.REQUEST_PRIORITY_LOW_POWER
          );
        }
      });
    });
    // this.diagnostic.switchToLocationSettings();
  }

  attachInternetConnectionListeners() {
    // watch network for a connection
    this.network.onConnect().subscribe(() => {
      this.internetAvailable = true;
      if (!this.signedIn) {
        this.connectRobotToParse();
      }
      console.log("network connected! This means internet!!!!!");
      // We just got a connection but we need to wait briefly
      // before we determine the connection type. Might need to wait.
      // prior to doing any api requests as well.
      setTimeout(() => {
        if (this.network.type === this.network.Connection.WIFI) {
          console.log("we got a wifi connection, woohoo!");
        }
      }, 3000);
    });

    this.network.onDisconnect().subscribe(() => {
      this.internetAvailable = false;
      console.log("network disconnected!");
    });
  }

  clearOldNamesFromParse() {
    console.log("Calling cloud function clearOldNames");
    return Parse.Cloud.run("clearOldNames")
      .then(result => {
        console.log("resolved:");
        console.log(result);
        return Promise.resolve();
      })
      .catch(err => {
        console.error('rejected:');
        console.error(err);
        return Promise.reject("failed to clear names");
      });
  }

  connectRobotToParse() {
    this.signInToParse().then(() => {
      this.signedIn = true;
      // Parse.User.current().set
      this.fetchDeviceFromParse().then(dev => {
        //Weird that we use two variables for the robotname. Should probably make something more logical, but fuck it for now!!
        let name = dev.get("name");
        if (!name) {
          return;
        }
        this.storedName = name;
        this.robotName = name;
      }).catch(err => console.error('no device found for this user'))
    });
  }

  signInToParse() {
    console.log("Gonna try to sign in to parse!!!");
    const currentUser = Parse.User.current();
    if (currentUser) {
      console.log("currentUser: ");
      console.log(currentUser);
      currentUser.set("lastLogin", new Date());

      // Let's double check the currentUser against server because it may be cached locally.
      // We don't know if the user is removed on server side
      return currentUser.save().then(
        res => {
          console.log("Saved lastLogin for user: ");
          console.log(res);
          // return Promise.resolve();
        },
        err => {
          if (this.isInvalidSessionTokenError(err)) {
            console.log(
              "Session had been invalidated. Trying to create new user instead"
            );
            Parse.User.logOut().then(
              res => {
                console.log(res);
                return this.signUpToParse();
              },
              err => {
                console.error(err);
                return this.signUpToParse();
              }
            );
          }
        }
      );
    } else {
      return this.createUserCredentials().then(credentials => {
        Parse.User.logIn(credentials.userName, credentials.password).then(
          user => {
            console.log("logged in to parse server");
            user.set("lastLogin", new Date());
            user.save(res => { });
            // return Promise.resolve();
          },
          err => {
            if (err.code !== Parse.ErrorCode.CONNECTION_FAILED) {
              console.error(err);
              console.error(err.code);
              console.log(
                "login attempt failed. Trying to create new user instead"
              );
              return this.signUpToParse();
            } else {
              console.error('connection error to parse:');
              console.error(err);
            }
          }
        );
      });
    }
  }

  async createUserCredentials() {
    console.log("creating user credentials");
    //Here we create username from a one directional hash from the serialNumber. This is to make it harder for someone to look up the password (by looking at the username).
    //new Uint8Array(this.device.uuid)
    const userName = await crypto.subtle
      .digest(
        { name: "SHA-256" },
        new encoding.TextEncoder("utf-8").encode(
          this.device.uuid + this.device.serial
        )
      )
      .then(hash => {
        // let asText = String.fromCharCode.apply(null, new Uint8Array(hash);
        let asText = new encoding.TextDecoder("utf-8").decode(
          new Uint8Array(hash)
        );
        return asText;
      });
    // console.log("username: " + userName);
    // console.log("password: " + this.device.uuid);
    return {
      userName: userName,
      password: this.device.uuid + this.device.serial
    };
  }

  async signUpToParse() {
    console.log("Trying to signup to parse server");
    const user = new Parse.User();

    let credentials = await this.createUserCredentials();
    user.set("username", credentials.userName);
    user.set("password", credentials.password);
    user.set("lastLogin", new Date());

    return user
      .signUp()
      .then(user => {
        console.log("user saved: " + user);
        // return Promise.resolve();
      })
      .catch(err => console.error(err));
  }

  ionViewDidLoad() { }

  isInvalidSessionTokenError(err) {
    return err.code === Parse.ErrorCode.INVALID_SESSION_TOKEN;
  }

  fetchDeviceFromParse() {
    let query = new Parse.Query("Device");
    query.equalTo("owner", Parse.User.current());
    return query
      .first()
      .then((dev: any) => {
        console.log("querying for the user's device: ");
        console.log(dev);
        if (dev) {
          // console.log("found a device owned by this user. Getting it's name.");
          return dev; //.get('name');
        } else {
          return Promise.reject("no device existed for this user");
        }
      })
      .catch(err => console.error(err));
  }

  checkIfNameExists(name) {
    let query = new Parse.Query("Device");
    query.equalTo("name", name);
    return query.first().then(dev => {
      if (!dev) {
        return Promise.reject("Didn't find any device with that name");
      }
      console.log(dev);
      return dev.get("name");
    });
  }

  clearRobotName() {
    if (!this.clearNamePressedOnce) {
      this.clearNamePressedOnce = true;
    } else {
      this.fetchDeviceFromParse().then(dev => {
        dev
          .unset("name")
          .save()
          .then(() => {
            console.log("removed robotname from parse");
            this.robotName = null;
            this.storedName = null;
            this.clearNamePressedOnce = false;
          })
          .catch(e => {
            console.error(
              "tried to remove robotname from parse, but something went wrong."
            );
            console.error(e);
          });
      });
    }
  }

  //This function has possible race condition to database, where we first check the name is available at all, and then assume this is still true when we later save it.
  // There is a (very small) risk another user will save the same name in between. I think this could be prevented with parse cloud code by checking uniqueness onBeforeSave.
  saveNameAndGoToRobotInterface() {
    console.log("trying to save name and go to robot interface.");
    this.robotName = this.robotName.trim().toLowerCase();

    let nameTakenQuery = new Parse.Query("Device");
    nameTakenQuery.equalTo("name", this.robotName);
    let nameIsAvailable = nameTakenQuery.first().then(dev => {
      console.log("query for chosen name gave:");
      console.log(dev);
      if (dev) {
        let acl = dev.getACL();
        console.log(acl);
        if (!acl || !acl.getWriteAccess(Parse.User.current())) {
          console.log("Name already taken by another user");
          this.invalidRobotName = this.robotName;
          return Promise.reject("Name already taken by another user");
        }
      }
      console.log("name was free");
      this.invalidRobotName = undefined;
    });

    nameIsAvailable.then(() => {
      let query = new Parse.Query("Device");
      query.equalTo("owner", Parse.User.current());
      let saveName = query.first().then(
        dev => {
          console.log("querying for device thats owned by user gave:");
          console.log(dev);
          if (dev) {
            console.log(
              "found a device owned by this user. Let's update the name"
            );
            dev.set("name", this.robotName);
            return dev.save().then(res => console.log(res));
          } else {
            console.log("no device existed for this user. Let's create one");
            let Device = Parse.Object.extend("Device");
            let dev = new Device();
            dev.set("name", this.robotName);
            dev.set("owner", Parse.User.current());
            let acl = new Parse.ACL();
            //Should reading the devices be completely open or restricted only to logged in users?
            //Do it public for now! Fuck security!!!
            // TODO: look over security for the device class
            acl.setPublicWriteAccess(false);
            acl.setPublicReadAccess(true);
            acl.setWriteAccess(Parse.User.current(), true);
            dev.setACL(acl);
            return dev.save().then(res => {
              console.log(res);
            });
          }
        },
        err => console.error(err)
      );

      saveName
        .then(() => {
          this.storage.set("robotName", this.robotName).then(() => {
            this.goToRobotInterface();
          });
        })
        .catch(err => console.error(err));
    });

    // firebase.database().ref('robot-names/' + this.robotName)
    //   .transaction((currentData) => {
    //     if (currentData === null) {
    //       return { device: this.device.uuid, created: (new Date).toISOString() };
    //     } else {
    //       console.log('robot name already exists.');
    //       return; // Abort the transaction.
    //     }
    //   })
    //   .then(({ committed, snapshot }) => {
    //     if (!committed) {
    //       console.log('We aborted the transaction (because robot name already exists).');
    //       this.invalidRobotName = this.robotName;
    //       // this.appRef.tick();
    //     } else {
    //       console.log('robot name added to firebase!');
    //       this.invalidRobotName = undefined;
    //       this.storage.set('robotName', this.robotName).then(() => {
    //         this.navCtrl.push(RobotInterfacePage, { robotName: this.robotName });
    //       });
    //     }
    //   })
    //   .catch((err) => {
    //     console.log('Transaction failed abnormally!', err);
    //   });
  }

  checkNameAndGoToDriverInterface() {
    this.robotName = this.robotName.trim().toLowerCase();

    this.checkIfNameExists(this.robotName)
      .then(result => {
        this.invalidRobotName = undefined;
        let idx = this.recentConnectedRobots.findIndex((element: any) => {
          return element.name === this.robotName;
        });
        if (idx >= 0) {
          //update the date!!!
          this.recentConnectedRobots[idx].date = Date.now();
        } else {
          this.recentConnectedRobots.push({
            name: this.robotName,
            date: Date.now()
          });
        }
        this.storage
          .set(
            "recent-connected-robots",
            JSON.stringify(this.recentConnectedRobots)
          )
          .then(() => {
            this.goToDriverInterface();
          });
      })
      .catch(err => {
        console.log("No such robot found");
        this.invalidRobotName = this.robotName;
      });

    // firebase.database().ref('robot-names/' + this.robotName).once('value').then((snapshot) => {
    //   if (!snapshot.val()) {
    //     console.log("No such robot found");
    //     this.invalidRobotName = this.robotName;
    //     return;
    //   }
    //   this.invalidRobotName = undefined;
    //   this.recentConnectedRobots[this.robotName] = Date.now();
    //   this.storage.set('recent-connected-robots', JSON.stringify(this.recentConnectedRobots)).then(() => {
    //     this.navCtrl.push(DriverInterfacePage, { robotName: this.robotName });
    //   });
    // });
  }

  goToDriverInterface() {
    this.navCtrl.push(DriverInterfacePage, { robotName: this.robotName });
  }

  //Maybe we should verify the name against parse server before continuing??
  goToRobotInterface() {
    this.navCtrl.push(RobotInterfacePage, { robotName: this.robotName });
  }

  robotsByDate(a, b) {
    return a.value > b.value ? -1 : 1;
  }
}
