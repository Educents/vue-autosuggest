import Vue from "vue";
import { action } from "@storybook/addon-actions";
import { storiesOf } from "@storybook/vue";

import Autosuggest from "../Autosuggest.vue";

const sharedData = {
    options: [
        "clifford kits",
        "friendly chemistry",
        "phonics",
        "life of fred",
        "life of fred math",
        "magic school bus",
        "math mammoth light blue",
        "handwriting",
        "math",
        "minecraft",
        "free worksheets",
        "4th grade",
        "snap circuits",
        "bath toys",
        "channies",
        "fred",
        "lego",
        "math life of fred",
        "multiplication",
        "thinking tree"
    ],
    methods: {
        onInputChange(text) {
            if (text === null) {
                return;
            }
            const filteredData = this.options[0].data.filter(item => {
                return item.toLowerCase().indexOf(text.toLowerCase()) > -1;
            });
            this.filteredOptions = [{ data: filteredData }];
        }
    }
};

storiesOf("Vue-Autosuggest", module)
    .add("simplest", () => ({
        components: { Autosuggest },
        template: `<div>
                    <div style="padding-top:10px; margin-bottom: 10px;"><span v-if="selected">You have selected '{{selected}}'</span></div>
                    <div>
                        <autosuggest :suggestions="filteredOptions" :inputProps="inputProps" :onSelected="onSelected" />
                    </div>
                </div>`,
        data() {
            return {
                selected: "",
                filteredOptions: [],
                options: [{data:sharedData.options.slice(0, 10)}],
                inputProps: {
                    id: "autosuggest__input",
                    onInputChange:this.onInputChange,
                    initialValue: "",
                    placeholder:"Type 'e'"
                },
                onSelected: (item) => {this.selected = item;}
            };
        },
        methods: sharedData.methods
    }))
    .add("simple with multiple sections", () => ({
        components: { Autosuggest },
        template: `<div>
                    <div style="padding-top:10px; margin-bottom: 10px;"><span v-if="selected">You have selected {{selected}}</span></div>
                    <div>
                        <autosuggest :suggestions="filteredOptions" :inputProps="inputProps" :sectionConfigs="sectionConfigs"
                        />
                    </div>
                </div>`,
        data() {
            return {
                selected: "",
                limit: 10,
                filteredOptions: [],
                options: [
                    {
                        data: sharedData.options
                    }
                ],
                sectionConfigs: {
                    default: {
                        limit: 6,
                        onSelected: (item) => {
                            console.log(`Selected "${item.item}"`);
                        }
                    }
                },
                inputProps: {
                    id: "autosuggest__input",
                    initialValue: "",
                    onClick: (item) => {console.log("hold my beer", item);},
                    onInputChange: this.onInputChange,
                    placeholder: "Type 'g'"
                }
            };
        },
        methods: {
            onInputChange(text) {
                if (text === null) {
                    return;
                }
                const filtered = [];
                const suggestionsData = this.options[0].data.filter(item => {
                    return item.toLowerCase().indexOf(text.toLowerCase()) > -1;
                });
    
                suggestionsData.length > 0 &&
                    filtered.push(
                        {
                            label: "Section 1",
                            data: suggestionsData
                        },
                        {
                            label: "Section 2",
                            data: suggestionsData
                        }
                    );
                this.filteredOptions = filtered;
            }
        }
    }))
    .add("with property: initial value", () => ({
        components: { Autosuggest },
        template: `<div>
                    <div style="padding-top:10px; margin-bottom: 10px;"><span v-if="selected">You have selected {{selected}}</span></div>
                    <div>
                        <autosuggest :suggestions="filteredOptions" :inputProps="inputProps" :sectionConfigs="sectionConfigs" />
                    </div>
                </div>`,
        data() {
            return {
                selected: "",
                limit: 10,
                filteredOptions: [],
                options: [
                    {
                        data: sharedData.options
                    }
                ],
                sectionConfigs: {
                    default: {
                        limit: 6,
                        onSelected: (item, originalInput) => {
                            console.log(`Selected "${item.item}"`);
                        }
                    }
                },
                inputProps: {
                    id: "autosuggest__input",
                    initialValue: "math",
                    onInputChange: this.onInputChange,
                    placeholder: "Type 'g'"
                }
            };
        },
        methods: sharedData.methods
    })).add("simple no filtering", () => ({
        components: { Autosuggest },
        template: `<div>
                    <div style="padding-top:10px; margin-bottom: 10px;"><span v-if="selected">You have selected '{{selected}}'</span></div>
                    <div>
                        <autosuggest 
                            :suggestions="[{data:['Frodo', 'Samwise', 'Gandalf', 'Galadriel', 'Faramir', 'Éowyn']}]"
                            :onSelected="onSelected"
                            :inputProps="{id:'autosuggest__input', onInputChange: this.onInputChange, placeholder:'Do you feel lucky, punk?'}"
                        />
                    </div>
                </div>`,
        data() {
            return {
                selected: "",
                filteredOptions: [],
                options: [{data:sharedData.options}]
            };
        },
        methods: {
            onInputChange(item) {console.log(item);},
            onSelected(item){this.selected = item;}
        }
    }));
