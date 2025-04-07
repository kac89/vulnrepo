import { Component,Inject,OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

@Component({
  selector: 'app-dialog-attach-preview',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-attach-preview.component.html',
  styleUrl: './dialog-attach-preview.component.scss'
})
export class DialogAttachPreviewComponent implements OnInit {

  defaultAttach:any;
  defaultIndex = 0;
  allAttachCount = 0;
  allAttach:any;
  dec_data:any;
  arrsa:any = [];
  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogAttachPreviewComponent>,@Inject(MAT_DIALOG_DATA) public data: any) {}

  ngOnInit() {
    this.defaultAttach = this.data[0];
    this.allAttach = this.data[1];
    this.dec_data = this.data[2];
    const index: number = this.allAttach.indexOf(this.defaultAttach);
    this.defaultIndex = index;

    this.allAttachCount = this.allAttach.length - 1;
  }

  closedialog(): void {
    this.dialogRef.close([this.allAttach,this.arrsa, this.dec_data]);
  }


  changePreview(direction) {
    if(direction === 'plus') {
      if(this.defaultIndex <= this.allAttachCount){
        if(this.allAttach[this.defaultIndex + 1]) {
          this.defaultAttach = this.allAttach[this.defaultIndex + 1];
          this.defaultIndex = this.defaultIndex + 1;
        }
      }
    }

    if(direction === 'minus') {
      if(this.defaultIndex >= 0){
        if(this.allAttach[this.defaultIndex - 1]) {
          this.defaultAttach = this.allAttach[this.defaultIndex - 1];
          this.defaultIndex = this.defaultIndex - 1;
        }
      }
    }
    
  }

  downloadAttach(data, name) {

    // convert base64 to raw binary data held in a string
    // doesn't handle URLEncoded DataURIs - see SO answer #6850276 for code that does this
    const byteString = atob(data.split(',')[1]);

    // separate out the mime component
    const mimeString = data.split(',')[0].split(':')[1].split(';')[0];

    // write the bytes of the string to an ArrayBuffer
    const ab = new ArrayBuffer(byteString.length);

    // create a view into the buffer
    const ia = new Uint8Array(ab);

    // set the bytes of the buffer to the correct values
    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    // write the ArrayBuffer to a blob, and you're done
    const blob = new Blob([ab], { type: mimeString });

    const fileName = name;
    const link = document.createElement('a');
    const url = window.URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', fileName);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

  }

  removeAttach(data) {

    
    const index: number = this.allAttach.indexOf(data);
    if (index !== -1) {
      this.arrsa.push(this.allAttach[index]);
      this.allAttach.splice(index, 1);
      this.allAttachCount = this.allAttach.length - 1;
      
      if(this.allAttach[this.defaultIndex]) {
        this.defaultAttach = this.allAttach[this.defaultIndex];
      }else if(this.allAttach[this.defaultIndex - 1]) {
        this.defaultAttach = this.allAttach[this.defaultIndex - 1];
        this.defaultIndex = this.defaultIndex - 1;
      }

      if(this.allAttachCount === -1) {
        this.dialogRef.close([this.allAttach,this.arrsa,this.dec_data]);
      }

    }
  }

}
