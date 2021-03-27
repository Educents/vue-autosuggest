<template>
  <div :id="componentAttrIdAutosuggest">
    <slot name="before-input" /><div
      role="combobox"
      :aria-expanded="isOpen ? 'true' : 'false'"
      aria-haspopup="listbox"
      :aria-owns="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
    ><input
      :type="internal_inputProps.type"
      :value="internalValue"
      :autocomplete="internal_inputProps.autocomplete"
      :class="[isOpen ? `${componentAttrPrefix}__input--open` : '', internal_inputProps['class']]"
      v-bind="internal_inputProps"
      aria-autocomplete="list"
      :aria-activedescendant="isOpen && currentIndex !== null ? `${componentAttrPrefix}__results-item--${currentIndex}` : ''"
      :aria-controls="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
      @input="inputHandler"
      @keydown="handleKeyStroke"
      v-on="listeners"
    ></div><slot name="after-input" />
    <div
      :id="`${componentAttrIdAutosuggest}-${componentAttrPrefix}__results`"
      :class="_componentAttrClassAutosuggestResultsContainer"
    >
      <div
        v-if="isOpen"
        :class="_componentAttrClassAutosuggestResults"
        :aria-labelledby="componentAttrIdAutosuggest"
      >
        <slot name="before-suggestions" />
        <component
          :is="cs.type"
          v-for="(cs, key) in computedSections"
          :ref="getSectionRef(`${cs.name}${key}`)"
          :key="getSectionRef(`${cs.name}${key}`)"
          :current-index="currentIndex"
          :normalize-item-function="normalizeItem"
          :render-suggestion="renderSuggestion"
          :section="cs"
          :component-attr-prefix="componentAttrPrefix"
          :component-attr-id-autosuggest="componentAttrIdAutosuggest"
          @updateCurrentIndex="updateCurrentIndex"
        >
          <template
            :slot="`before-section-${cs.name || cs.label}`"
            slot-scope="{section, className}"
          >
            <slot
              :name="`before-section-${cs.name || cs.label}`"
              :section="section"
              :className="className"
            />
          </template>
          <template slot-scope="{ suggestion, _key }">
            <slot
              :suggestion="suggestion"
              :index="_key"
            >
              {{ suggestion.item }}
            </slot>
          </template>
          <template
            :slot="`after-section-${cs.name || cs.label}`"
            slot-scope="{section}"
          >
            <slot
              :name="`after-section-${cs.name || cs.label}`"
              :section="section"
            />
          </template>
          <template
            slot="after-section"
            slot-scope="{section}"
          >
            <slot
              name="after-section"
              :section="section"
            />
          </template>
        </component>
        <slot name="after-suggestions" />
      </div>
      <slot name="after-suggestions-container" />
    </div>
  </div>
</template>

<script>

/**
 * @typedef {Object} ResultSection
 * @prop {String} name - Name of the section
 * @prop {String} label - What is displayed in the section header, is exists
 * @prop {String} type - Used to decide which component to use for section
 * @prop {Number} limit - max number of results
 * @prop {Array} data - the results
 * @prop {Number} start_index - tracks section start reference point
 * @prop {Number} end_index - tracks section end reference point
 * @prop {Object} ulClass - class for <ul> of section e.g. { 'bg-blue': true }
 * @prop {Object} liClass - class for all <li>'s in section
 */

/**
 * @typedef {Object} ResultItem
 * @prop {Object<any>} item - data object
 * @prop {ResultSection.liClass} liClass
 * @prop {ResultSection.label} label
 * @prop {ResultSection.type} type
 */

import DefaultSection from "./parts/DefaultSection.js";
import { addClass, removeClass } from "./utils";

const INDEX_IS_FOCUSED_ON_INPUT = -1

const defaultSectionConfig = {
  name: "default",
  type: "default-section"
}

export default {
  name: "Autosuggest",
  components: {
    /* eslint-disable-next-line vue/no-unused-components */
    DefaultSection
  },
  props: {
    /** Allows for v-model support */
    value: {
      type: String,
      default: null
    },
    /** v-binds to the <input /> tag for fine-grain control */
    inputProps: {
      type: Object,
      required: true
    },
    /** limits the number of suggestions for all sections */
    limit: {
      type: Number,
      required: false,
      default: Infinity
    },
    highlightFirstSuggestion: {
      type: Boolean,
      default: false
    },
    persistHighlighted: {
      type: Boolean,
      default: false
    },
    suggestions: {
      type: Array,
      required: true
    },
    renderSuggestion: {
      type: Function,
      required: false,
      default: null
    },
    getSuggestionValue: {
      type: Function,
      required: false,
      default: suggestion => {
        const item = suggestion.item;
        if (typeof item === "object" && item.hasOwnProperty("name")) {
          return item.name;
        } else {
          return item;
        }
      }
    },
    shouldRenderSuggestions: {
      type: Function,
      required: false,
      default: (totalResults, loading) => {
        return totalResults > 0 && !loading;
      }
    },
    sectionConfigs: {
      type: Object,
      required: false,
      default: () => {
        return {
          default: {
            onSelected: null
          }
        };
      }
    },
    onSelected: {
      type: Function,
      required: false,
      default: null
    },
    componentAttrIdAutosuggest: {
      type: String,
      required: false,
      default: "autosuggest"
    },
    componentAttrClassAutosuggestResultsContainer: {
      type: String,
      required: false,
      default: null  // `${componentAttrPrefix}__results-container`
    },
    componentAttrClassAutosuggestResults: {
      type: String,
      required: false,
      default: null // `${componentAttrPrefix}__results`
    },
    componentAttrPrefix: {
      type: String,
      required: false,
      default: "autosuggest"
    }
  },
  data() {
    return {
      internalValue: null,
      searchInputOriginal: null,
      currentIndex: null,
      /** @type ResultItem|null */
      currentItem: null,
      // TODO use event states instead of generic "loading" variable
      loading: false /** Helps with making sure the dropdown doesn't stay open after certain actions */,
      didSelectFromOptions: false,
      defaultInputProps: {
        type: 'text',
        autocomplete: "off",
      },
      /** @type Number */
      clientXMouseDownInitial: null
    };
  },
  computed: {
    /**
     * Merged object for defaults + user defined `<input/>` props
     */
    internal_inputProps() {
      return {
        ...this.defaultInputProps,
        ...this.inputProps
      }
    },
    listeners() {
      return {
        ...this.$listeners,
        input: e => {
          // Don't do anything native here, since we have inputHandler
          return
        },
        /**
         * Wrap native click handler to allow for added behavior
         */
        click: () => {
          /* eslint-disable-next-line vue/no-side-effects-in-computed-properties */
          this.loading = false;
          this.$listeners.click && this.$listeners.click(this.currentItem);
          this.$nextTick(() => {
            this.ensureItemVisible(this.currentItem, this.currentIndex);
          })
        },
        selected: () => {
          /**
           * Determine which onSelected to fire. This can be either from inside
           * a section's object, from the `@selected` event
           */
          if (
            this.currentItem &&
            this.sectionConfigs[this.currentItem.name] &&
            this.sectionConfigs[this.currentItem.name].onSelected
          ) {
            this.sectionConfigs[this.currentItem.name].onSelected(
              this.currentItem,
              this.searchInputOriginal
            );
          } else if (this.sectionConfigs["default"].onSelected) {
            this.sectionConfigs["default"].onSelected(null, this.searchInputOriginal);
          } else if (this.$listeners.selected) {
            this.$emit('selected', this.currentItem, this.currentIndex);
          }
          this.setChangeItem(null)
        }
      };
    },
    /**
     * @returns {Boolean}
     */
    isOpen() {
      return this.shouldRenderSuggestions(this.totalResults, this.loading)
    },
    /**
     * Normalize suggestions into sections based on defaults and section
     * configs.
     * @returns {Array<ResultSection>}
     */
    computedSections() {
      let tmpSize = 0
      return this.suggestions.map(section => {
        if (!section.data) return;

        const name = section.name ? section.name : defaultSectionConfig.name;
        let limit, label, type, ulClass, liClass = null

        if (this.sectionConfigs[name]) {
          limit = this.sectionConfigs[name].limit
          type = this.sectionConfigs[name].type
          label = this.sectionConfigs[name].label
          ulClass = this.sectionConfigs[name].ulClass
          liClass = this.sectionConfigs[name].liClass
        }

        /** Set defaults for section configs. */
        type = type ? type : defaultSectionConfig.type;

        limit = limit || this.limit
        limit = limit ? limit : Infinity;
        limit = section.data.length < limit ? section.data.length : limit;
        label = label ? label : section.label;

        const computedSection = {
          name,
          label,
          type,
          limit,
          data: section.data,
          start_index: tmpSize,
          end_index: tmpSize + limit - 1,
          ulClass,
          liClass
        }

        tmpSize += limit;

        return computedSection
      })
    },
    /**
     * Calculate number of results in each section.
     * @returns {Number}
     */
    totalResults () {
      return this.computedSections.reduce((acc, section) => {
        // For each section, make sure we calculate the size
        // based on how many are rendered, which maxes out at
        // the limit but can be less than the limit.
        if (!section) return acc
        const { limit, data } = section
        return acc + (data.length >= limit ? limit : data.length)
      }, 0)
    },

    _componentAttrClassAutosuggestResultsContainer () {
      return this.componentAttrClassAutosuggestResultsContainer || `${this.componentAttrPrefix}__results-container`
    },
    _componentAttrClassAutosuggestResults () {
      return this.componentAttrClassAutosuggestResults || `${this.componentAttrPrefix}__results`
    },
  },
  watch: {
    /**
     * Support initialValue
     */
    value: {
      handler(newValue){
        this.internalValue = newValue
      },
      immediate: true
    },
    /**
     * Emits opened/closed events
     * @returns {Boolean}
     */
    isOpen: {
      handler(newValue, oldValue){
        if (newValue !== oldValue) {
          this.$emit(newValue ? 'opened' : 'closed');
        }
      },
      immediate: true
    },
    suggestions: {
      handler(newValue){
        if (this.highlightFirstSuggestion && newValue.length > 0) {
          this.setCurrentIndex(1, this.totalResults);
        }
      }
    }
  },
  created() {
    this.loading = true;
  },
  mounted() {
    document.addEventListener("mouseup", this.onDocumentMouseUp);
    document.addEventListener("mousedown", this.onDocumentMouseDown);
  },
  beforeDestroy() {
    document.removeEventListener("mouseup", this.onDocumentMouseUp)
    document.removeEventListener("mousedown", this.onDocumentMouseDown)
  },
  methods: {
    /**
     * handler for @input <input /> events to support v-model behavior.
     * @param {InputEvent} e
     */
    inputHandler(e) {
      const newValue = e.target.value
      this.$emit('input', newValue)
      this.internalValue = newValue
      if (!this.didSelectFromOptions) {
        this.searchInputOriginal = newValue;
        this.currentIndex = null;
      }
    },
    /**
     * Helper for making sure the sectionRef getter is consistent
     * @returns {String}
     */
    getSectionRef(i) {
      return "computed_section_" + i;
    },
    /**
     * Helper for getting a suggestion item by index.
     * @returns {ResultItem}
     */
    getItemByIndex(index) {
      let obj = false;
      if (index === null) return obj;
      for (var i = 0; i < this.computedSections.length; i++) {
        if (
          index >= this.computedSections[i].start_index &&
          index <= this.computedSections[i].end_index
        ) {
          let trueIndex = index - this.computedSections[i].start_index;
          const sectionName = this.computedSections[i].name
          let childSection = this.$refs[this.getSectionRef(`${sectionName}${i}`)][0];
          if (childSection) {
            obj = this.normalizeItem(
              this.computedSections[i].name,
              this.computedSections[i].type,
              childSection.section.label,
              childSection.section.liClass,
              childSection.getItemByIndex(trueIndex)
            );
            break;
          }
        }
      }

      return obj;
    },
    /**
     * Handler for 'keydown' event. Does a number of things, including making
     * sure to ignore keycodes, ensure items are visible and also that the input
     * value is updated/reset according to where the user has keyed to.
     * @param {MouseEvent} e
     * @returns {void}
     */
    handleKeyStroke(e) {
      const { keyCode } = e;

      const ignoredKeyCodes = [
        16, // Shift
        9,  // Tab
        17, // ctrl
        18, // alt/option
        91, // OS Key
        93  // Right OS Key
      ];

      if (ignoredKeyCodes.indexOf(keyCode) > -1) {
        return;
      }

      const wasClosed = !this.isOpen
      this.loading = false;
      this.didSelectFromOptions = false;
      if (this.isOpen) {
        switch (keyCode) {
          case 40: // ArrowDown
          case 38: // ArrowUp
            e.preventDefault();
            if (keyCode === 38 && this.currentIndex === null) {
              break;
            }
            // Determine direction of arrow up/down and determine new currentIndex
            const direction = keyCode === 40 ? 1 : -1;
            const newIndex = Math.max((parseInt(this.currentIndex) || 0) + (wasClosed ? 0 : direction), INDEX_IS_FOCUSED_ON_INPUT);

            this.setCurrentIndex(newIndex, this.totalResults);
            this.didSelectFromOptions = true;
            if (this.totalResults > 0 && this.currentIndex >= 0) {
              this.setChangeItem(this.getItemByIndex(this.currentIndex));
              this.didSelectFromOptions = true;
            } else if (this.currentIndex === INDEX_IS_FOCUSED_ON_INPUT) {
              this.setChangeItem(null)
              this.internalValue = this.searchInputOriginal;
              e.preventDefault();
            }

            this.$nextTick(() => {
              this.ensureItemVisible(this.currentItem, this.currentIndex);
            })
            break;
          case 13: // Enter
            e.preventDefault();

            if (this.totalResults > 0 && this.currentIndex >= 0) {
              this.setChangeItem(this.getItemByIndex(this.currentIndex), true);
              this.didSelectFromOptions = true;
            }

            this.loading = true;
            this.listeners.selected(this.didSelectFromOptions);
            break;
          case 27: // Escape
            /**
             * For 'search' input type, make sure the browser doesn't clear the
             * input when Escape is pressed.
             */
            this.loading = true;
            this.currentIndex = null;
            this.internalValue = this.searchInputOriginal;
            this.$emit('input', this.searchInputOriginal);
            e.preventDefault();
            break;
        }
      }
    },
    /**
     * Wrapper around currentItem setter to emit events and ensure to update the
     * searchInputOriginal when a user selects an option.
     * @param {ResultItem} item
     * @param {Boolean} overrideOriginalInput determine if the 'saved' original
     *   input should be updated. When a user selects an option, this will be
     *   updated, but if a user keys into the <input/> then the input will be
     *   reset to the searchInputOriginal.
     * @return {void}
     */
    setChangeItem(item, overrideOriginalInput = false) {
      if (this.currentIndex === null || !item) {
        this.currentItem = null;
        this.$emit('item-changed', null, null)
      } else if (item) {
        this.currentItem = item;
        this.$emit('item-changed', item, this.currentIndex)
        const v = this.getSuggestionValue(item)
        this.internalValue = v;
        if (overrideOriginalInput) {
          this.searchInputOriginal = v;
        }
        this.ensureItemVisible(item, this.currentIndex);
      }
    },

    /**
     * Function to standardize suggestion item object picked from sections
     * @returns {ResultItem}
     */
    normalizeItem(name, type, label, className, item) {
      return {
        name,
        type,
        label,
        liClass: item.liClass || className,
        item
      };
    },

    /**
     * Adjust the scroll position to the item in the suggestions overflow
     * @param {ResultItem} item - suggestion item
     * @param {Number} index - item index
     * @param {String} selector - selector of item that is overflowed
     */
    ensureItemVisible(item, index, selector) {
      const resultsScrollElement = this.$el.querySelector(
        selector || `.${this._componentAttrClassAutosuggestResults}`
      );

      if (!resultsScrollElement) {
        return
      }

      const itemElement = resultsScrollElement.querySelector(`#${this.componentAttrPrefix}__results-item--${index}`);
      if (!itemElement) {
        return;
      }

      const resultsScrollWindowHeight = resultsScrollElement.clientHeight;
      const resultsScrollScrollTop = resultsScrollElement.scrollTop;

      const itemHeight = itemElement.clientHeight;
      const currentItemScrollOffset = itemElement.offsetTop;

      if (
        itemHeight + currentItemScrollOffset >=
        resultsScrollScrollTop + resultsScrollWindowHeight
      ) {
        /** Current item goes below visible scroll window */
        resultsScrollElement.scrollTop = itemHeight + currentItemScrollOffset - resultsScrollWindowHeight;
      } else if (currentItemScrollOffset < resultsScrollScrollTop && resultsScrollScrollTop > 0) {
        /** Current item goes above visible scroll window */
        resultsScrollElement.scrollTop = currentItemScrollOffset;
      }
    },
    /**
     * @param {Number} index
     */
    updateCurrentIndex(index) {
      this.setCurrentIndex(index, -1, true);
    },
    /**
     * Helper to detect if the user clicked on the scrollbar
     * @param {MouseEvent} e
     * @param {Number} mouseX - horizontal position of the mouse relative to
     *   results e.g. an offset of clientX
     */
    clickedOnScrollbar(e, mouseX){
      const results = this.$el.querySelector(`.${this._componentAttrClassAutosuggestResults}`);

      const mouseIsInsideScrollbar = results && results.clientWidth <= (mouseX + 17) &&
        mouseX + 17 <= results.clientWidth + 34
      return e.target.tagName === 'DIV' && results && mouseIsInsideScrollbar || false;
    },
    /**
     * Capture mousedown position so we can use it to detect if the scrollbar
     * was clicked
     * @param {MouseEvent} e
     */
    onDocumentMouseDown(e) {
      var rect = e.target.getBoundingClientRect ? e.target.getBoundingClientRect() : 0;
      this.clientXMouseDownInitial = e.clientX - rect.left;
    },
    /**
     * 'mouseup' event handler
     * @param {MouseEvent} e
     */
    onDocumentMouseUp(e) {
      /** Do not re-render list on input click  */
      const isChild = this.$el.contains(e.target);

      /* Clicks outside of dropdown */
      if (!isChild) {
        this.loading = true;
        (!this.persistHighlighted) && (this.currentIndex = null);
        return;
      }

      if (e.target.tagName === 'INPUT' ||
        (this.clickedOnScrollbar(e, this.clientXMouseDownInitial))) {
        return;
      }

      /** Selects an item in the dropdown */
      this.loading = true;
      this.didSelectFromOptions = true;
      this.setChangeItem(this.getItemByIndex(this.currentIndex), true);
      this.listeners.selected(true);
    },
    /**
     * Sets the current index of the highlighted object, useful for aria
     * attributes like `aria-activedescendant` and toggling which result item
     * is highlighted.
     * @param {Number} newIndex
     * @param {Number} limit
     * @param {Boolean} onHover detects if the user is hovering vs. selected
     */
    setCurrentIndex(newIndex, limit = -1, onHover = false) {
      let adjustedValue = newIndex;

      /**
       * If you're not hovering, you might be keying outside of the bounds, so
       * we need to make sure that we adjust for the limits.
       */
      if (!onHover){
        const hitLowerLimt = this.currentIndex === null
        const hitUpperLimit = newIndex >= limit
        if (hitLowerLimt || hitUpperLimit) {
          adjustedValue = 0;
        }
      }

      this.currentIndex = adjustedValue;
      const element = this.$el.querySelector(`#${this.componentAttrPrefix}__results-item--${this.currentIndex}`);
      const hoverClass = `${this.componentAttrPrefix}__results-item--highlighted`;

      if (this.$el.querySelector(`.${hoverClass}`)) {
        removeClass(this.$el.querySelector(`.${hoverClass}`), hoverClass);
      }
      if (element) {
        addClass(element, hoverClass);
      }
    }
  },
};
</script>
