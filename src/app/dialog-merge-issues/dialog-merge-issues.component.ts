import { Component, OnInit, Inject, ChangeDetectionStrategy, computed, inject, model, signal } from '@angular/core';
import { MatDialog, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { COMMA, ENTER } from '@angular/cdk/keycodes';
import { MatChipInputEvent, MatChipsModule } from '@angular/material/chips';
import { MatAutocompleteModule, MatAutocompleteSelectedEvent } from '@angular/material/autocomplete';

@Component({
  selector: 'app-dialog-merge-issues',
  standalone: false,
  //imports: [],
  templateUrl: './dialog-merge-issues.component.html',
  styleUrl: './dialog-merge-issues.component.scss'
})
export class DialogMergeIssuesComponent implements OnInit {

  readonly separatorKeysCodes: number[] = [ENTER, COMMA];
  readonly currentFruit = model('');
  readonly fields = signal(['Files', 'Proof of Concept', 'References']);
  readonly allFruits: string[] = ['Description', 'Files', 'Proof of Concept', 'References', 'Tags'];
  readonly filteredFruits = computed(() => {
    const currentFruit = this.currentFruit().toLowerCase();
    return currentFruit
      ? this.allFruits.filter(fruit => fruit.toLowerCase().includes(currentFruit))
      : this.allFruits.slice();
  });

  selectedop: any;
  selectfields: any;
  user_selected = '';

  // @ts-ignore
  constructor(public dialogRef: MatDialogRef<DialogMergeIssuesComponent>, @Inject(MAT_DIALOG_DATA) public data: any) {

  }

  ngOnInit() {

    const selecteditems: any = [];

    this.data.forEach(element => {
      selecteditems.push(element.data);
    });

    this.selectedop = selecteditems;

  }

  closedialog(): void {
    this.dialogRef.close();
  }


  add(event: MatChipInputEvent): void {
    const value = (event.value || '').trim();

    if (value) {
      if(!this.fields().includes(event.value)) {
        this.fields.update(fields => [...fields, value]);
      }
      
    }

    // Clear the input value
    this.currentFruit.set('');
  }

  remove(fruit: string): void {
    this.fields.update(fields => {
      const index = fields.indexOf(fruit);
      if (index < 0) {
        return fields;
      }

      fields.splice(index, 1);
      return [...fields];
    });
  }

  selected(event: MatAutocompleteSelectedEvent): void {

    if(!this.fields().includes(event.option.viewValue)) {
      this.fields.update(fields => [...fields, event.option.viewValue]);
    }
    
    this.currentFruit.set('');
    event.option.deselect();
  }


  merge() {

    let oryginal_selection = this.user_selected;

    const tomerge: any = [];
    this.data.forEach(element => {
      if (element.data !== this.user_selected) {
        tomerge.push(element.data);
      }
    });

    tomerge.forEach(element => {
      

      if(this.fields().includes("Description")) {
        if(JSON.stringify(oryginal_selection['desc']) !== JSON.stringify(element.desc)){
          this.user_selected['desc'] = this.user_selected['desc'] + "\n\n" + element.desc;
        }
      }

      if(this.fields().includes("References")) {

        if(JSON.stringify(oryginal_selection['ref']) !== JSON.stringify(element.ref)){
          this.user_selected['ref'] = this.user_selected['ref'] + "\n\n" + element.ref;
        }

      }

      if(this.fields().includes("Proof of Concept")) {

        if(JSON.stringify(oryginal_selection['poc']) !== JSON.stringify(element.poc)){
          this.user_selected['poc'] = this.user_selected['poc'] + "\n\n" + element.poc;
        }

      }

      if(this.fields().includes("Files")) {
        if(JSON.stringify(oryginal_selection['files']) !== JSON.stringify(element.files)){
          this.user_selected['files'] = this.user_selected['files'].concat(element.files);
        }
        
      }

      if(this.fields().includes("Tags")) {
        if(JSON.stringify(oryginal_selection['tags']) !== JSON.stringify(element.tags)){
          this.user_selected['tags'] = this.user_selected['tags'].concat(element.tags);
        }
        
      }

      
    });
    
    this.dialogRef.close(tomerge);


  }

}
