import { Component } from "@angular/core";
import { Platform } from "ionic-angular";
import { StatusBar } from "@ionic-native/status-bar";
import { SplashScreen } from "@ionic-native/splash-screen";
import { TabsPage } from "../pages/tabs/tabs";
import { BLE } from "@ionic-native/ble";
import { BleService } from "../providers/bleservice/BleService";

@Component({
  templateUrl: "app.html"
})
export class MyApp {
  rootPage: any = TabsPage;

  constructor(
    platform: Platform,
    statusBar: StatusBar,
    splashScreen: SplashScreen,
    public ble: BLE,
    private bleService: BleService,
  ) {
    platform.ready().then(() => {
      // document.addEventListener("deviceready", () => {
      //   this.androidPermissions.requestPermissions([
      //     this.androidPermissions.PERMISSION.CAMERA,
      //     this.androidPermissions.PERMISSION.RECORD_AUDIO
      //   ]);
      //   // this.bleService.start();
      // });

      // Okay, so the platform is ready and our plugins are available.
      // Here you can do any higher level native things you might need.
      statusBar.styleDefault();
      splashScreen.hide();
    });
  }
}
