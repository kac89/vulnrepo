import { Injectable } from '@angular/core';
// Author: https://gist.github.com/leewinder/a1f6bc5100fc2573b47bb2e0b7937f34

export const enum PasswordCheckStrength {
  Short,
  Common,
  Weak,
  Ok,
  Strong
}

@Injectable({
  providedIn: 'root'
})
export class SeckeyValidatorService {

  constructor() { }

  public static get MinimumLength(): number {
      return 8;
  }
  private commonPasswordPatterns = /passw.*|12345.*|09876.*|qwert.*|asdfg.*|zxcvb.*/;

  public isPasswordCommon(password: string): boolean {
      return this.commonPasswordPatterns.test(password);
  }

  public checkPasswordStrength(password: string): PasswordCheckStrength {

      let numberOfElements = 0;
      numberOfElements = /.*[a-z].*/.test(password) ? ++numberOfElements : numberOfElements;      // Lowercase letters
      numberOfElements = /.*[A-Z].*/.test(password) ? ++numberOfElements : numberOfElements;      // Uppercase letters
      numberOfElements = /.*[0-9].*/.test(password) ? ++numberOfElements : numberOfElements;      // Numbers
      numberOfElements = /[^a-zA-Z0-9]/.test(password) ? ++numberOfElements : numberOfElements;   // Special characters (inc. space)

      let currentPasswordStrength = 0;
      if (password === null || password.length < SeckeyValidatorService.MinimumLength) {
          currentPasswordStrength = PasswordCheckStrength.Short;
      } else if (this.isPasswordCommon(password) === true) {
          currentPasswordStrength = PasswordCheckStrength.Common;
      } else if (numberOfElements === 0 || numberOfElements === 1 || numberOfElements === 2) {
          currentPasswordStrength = PasswordCheckStrength.Weak;
      } else if (numberOfElements === 3) {
          currentPasswordStrength = PasswordCheckStrength.Ok;
      } else {
          currentPasswordStrength = PasswordCheckStrength.Strong;
      }
      return currentPasswordStrength;
  }
}
