import { mount, shallowMount } from "@vue/test-utils";
import { createRenderer } from "vue-server-renderer";

import Autosuggest from "../src/Autosuggest.vue";

Element.prototype.scrollTo = () => {}; // https://github.com/vuejs/vue-test-utils/issues/319

// Helper to call function x number of times
const times = x => f => {
  if (x > 0) {
    f();
    times(x - 1)(f);
  }
};

describe("Autosuggest", () => {
  const id = `autosuggest__input`;
  const filteredOptions = [
    {
      data: [
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
      ]
    }
  ];

  const defaultProps = {
    suggestions: filteredOptions,
    inputProps: {
      id,
      initialValue: "",
      onInputChange: () => {},
      placeholder: "Type 'G'"
    },
    sectionConfigs: {
      default: {
        limit: 5,
        onSelected: () => {}
      }
    }
  };

  const defaultListeners = {
    click: () => {}
  };

  it("can mount", () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);

    props.suggestions = [filteredOptions[0]];

    const wrapper = shallowMount(Autosuggest, {
      propsData: props
    });

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) throw new Error(err);
      expect(str).toMatchSnapshot();
    });
  });

  it("can render suggestions", () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);

    // Testing deprecation of onClick
    const mockFn = jest.fn();
    const mockConsole = jest.fn();
    console.warn = mockConsole;

    const clicked = () => {
      mockFn();
    };

    props.inputProps.onClick = clicked;

    const wrapper = mount(Autosuggest, {
      propsData: props,
      attachToDocument: true
    });

    const input = wrapper.find("input");
    expect(input.attributes("id", defaultProps.inputProps.id)).toBeTruthy();

    input.trigger("click");
    wrapper.setData({ searchInput: "G" });
    input.trigger("keydown.down");

    expect(wrapper.findAll(`ul li`).length).toBeLessThanOrEqual(
      defaultProps.sectionConfigs.default.limit
    );

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) throw new Error(err);
      expect(str).toMatchSnapshot();
      expect(mockFn).toHaveBeenCalledTimes(1); // deprecation warning
    });
  });

  it("can use escape key to exit", async () => {
    const wrapper = mount(Autosuggest, {
      propsData: defaultProps,
      listeners: defaultListeners
    });

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "G" });

    input.trigger("keydown.up"); // Check it doesn't offset the selection by going up first when nothing is selected.

    // TODO: test these keys are actually returning early.
    input.trigger("keydown", {
      keyCode: 16 // Shift
    });
    input.trigger("keydown", {
      keyCode: 9 // Tab
    });
    input.trigger("keydown", {
      keyCode: 18 // alt/option
    });
    input.trigger("keydown", {
      keyCode: 91 // OS Key
    });
    input.trigger("keydown", {
      keyCode: 93 // Right OS Key
    });

    input.trigger("keydown.down");

    expect(wrapper.findAll(`ul li`).length).toBeLessThanOrEqual(
      defaultProps.sectionConfigs.default.limit
    );

    input.trigger("keydown.esc");

    expect(wrapper.findAll(`ul li`).length).toEqual(0);

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("can select from suggestions using keystroke", async () => {
    const wrapper = mount(Autosuggest, {
      propsData: defaultProps,
      attachToDocument: true
    });

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "G" });

    times(5)(() => {
      input.trigger("keydown.down");
    });

    times(5)(() => {
      input.trigger("keydown.up");
    });

    input.trigger("keydown.enter");

    await wrapper.vm.$nextTick(() => {});

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("can click outside document to trigger close", async () => {
    const props = Object.assign({}, defaultProps);

    const wrapper = mount(Autosuggest, {
      propsData: props,
      listeners: defaultListeners,
      attachToDocument: true
    });

    wrapper.setData({ searchInput: "G" });

    const input = wrapper.find("input");

    input.trigger("click");
    wrapper.setData({ searchInput: "G" });
    window.document.dispatchEvent(new Event("mousedown"));
    window.document.dispatchEvent(new Event("mouseup"));
    
    await wrapper.vm.$nextTick(() => {});

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("can display section header", async () => {
    const props = Object.assign({}, defaultProps);
    props.sectionConfigs = {
      default: {
        label: "Suggestions",
        limit: 5,
        onSelected: () => {}
      }
    };
    const wrapper = mount(Autosuggest, {
      propsData: props,
      listeners: defaultListeners,
      attachToDocument: true
    });

    wrapper.setData({ searchInput: "G" });

    const input = wrapper.find("input");

    input.trigger("click");
    wrapper.setData({ searchInput: "G" });
    expect(wrapper.find("ul li:nth-child(1)").element.innerHTML).toBe(
      props.sectionConfigs.default.label
    );
    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("is aria complete", async () => {
    const wrapper = mount(Autosuggest, {
      propsData: defaultProps
    });

    const input = wrapper.find("input");
    expect(input.attributes()["role"]).toBe("combobox");
    expect(input.attributes()["aria-autocomplete"]).toBe("list");
    expect(input.attributes()["aria-activedescendant"]).toBe("");
    expect(input.attributes()["aria-owns"]).toBe("autosuggest__results");
    expect(input.attributes()["aria-owns"]).toBe("autosuggest__results");

    // TODO: Make sure aria-completeness is actually 2legit2quit.

    input.trigger("click");
    wrapper.setData({ searchInput: "G" });

    expect(input.attributes()["aria-haspopup"]).toBe("true");

    const mouseDownTimes = 3;
    times(mouseDownTimes)(() => {
      input.trigger("keydown.down");
    });

    const activeDescendentString = input.attributes()["aria-activedescendant"];
    expect(parseInt(activeDescendentString[activeDescendentString.length - 1])).toBe(
      mouseDownTimes - 1
    );
    expect(input.element.value).toBe(filteredOptions[0].data[mouseDownTimes - 1]);

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("can render simplest component with single onSelected", async () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);
    props.inputProps.class = "cool-class";
    props.suggestions = filteredOptions;

    delete props.suggestions[0].name; // ensure empty component name is OK
    delete props.sectionConfigs; // ensure empty sectionConfigs is OK
    delete props.inputProps.onClick; // ensure empty onClick is OK

    props.onSelected = () => {};

    const wrapper = mount(Autosuggest, {
      propsData: props,
      attachToDocument: true
    });

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "G" });

    times(3)(() => {
      input.trigger("keydown.down");
    });

    wrapper.find("li").trigger("mouseover");
    wrapper.find("li").trigger("mouseenter");
    wrapper.find("li").trigger("mouseleave");

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("onBlur and onFocus work as expected, including deprecation warnings", async () => {
    let props = Object.assign({}, defaultProps);

    const mockFn = jest.fn();
    const mockConsole = jest.fn();

    console.warn = mockConsole;

    const blurred = () => {
      mockFn();
    };
    const focused = () => {
      mockFn();
    };
    const selected = () => {
      mockFn();
    };

    props.inputProps.onBlur = blurred;
    props.inputProps.onFocus = focused;
    delete props['sectionConfigs'];
    props.onSelected = selected;

    const wrapper = mount(Autosuggest, {
      propsData: props,
      attachToDocument: true
    });

    const input = wrapper.find("input");

    input.trigger("click");
    wrapper.setData({ searchInput: "G" });
    await wrapper.vm.$nextTick(() => {});

    input.trigger("blur");
    input.trigger("focus");

    input.trigger("keydown.down");
    input.trigger("keydown.down");
    input.trigger("keydown.enter");

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });

    expect(mockFn).toHaveBeenCalledTimes(3);
    expect(mockConsole).toHaveBeenCalledTimes(3); // onBlur and onFocus deprecation warnings
  });

  it("can render default suggestion value by property name", async () => {
    const props = Object.assign({}, defaultProps);
    props.inputProps = Object.assign({}, defaultProps.inputProps);
    props.inputProps.class = "cool-class";
    props.suggestions = [
      {
        data: [
          {
            id: 1,
            name: "Frodo",
            avatar:
              "https://upload.wikimedia.org/wikipedia/en/4/4e/Elijah_Wood_as_Frodo_Baggins.png"
          }
        ]
      }
    ];

    props.onSelected = () => {};

    const wrapper = mount(Autosuggest, {
      propsData: props,
      attachToDocument: true
    });

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "F" });

    input.trigger("keydown.down");
    input.trigger("keydown.enter");

    await wrapper.vm.$nextTick(() => {});

    expect(input.element.value).toBe("Frodo");

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("changes input attributes", () => {
    const props = { ...defaultProps };
    props.inputProps = { ...defaultProps.inputProps, name: "my-input" };

    const wrapper = mount(Autosuggest, {
      propsData: props
    });

    const input = wrapper.find("input");
    expect(input.attributes()["name"]).toBe("my-input");
  });

  it("search input prop type handles string and integers only", async () => {
    let props = Object.assign({}, defaultProps);

    const mockConsole = jest.fn();
    console.error = mockConsole;

    const blurred = () => {};
    props.inputProps.onBlur = blurred;

    const wrapper = mount(Autosuggest, {
      propsData: props
    });

    const input = wrapper.find("input");

    // Integers
    input.trigger("click");
    wrapper.setData({ searchInput: 1 });
    await wrapper.vm.$nextTick(() => {});
    input.trigger("blur");

    // Strings
    input.trigger("click");
    wrapper.setData({ searchInput: "Hello" });
    await wrapper.vm.$nextTick(() => {});
    input.trigger("blur");

    // Should not throw any errors
    expect(mockConsole).toHaveBeenCalledTimes(0);

    // Functions
    input.trigger("click");
    wrapper.setData({ searchInput: () => { /* BAD */ } });
    await wrapper.vm.$nextTick(() => {});
    input.trigger("blur");
    
    // Should throw validation error
    expect(mockConsole).toHaveBeenCalled();
  });

  it("can render slots", async () => {
    const wrapper = mount(Autosuggest, {
      propsData: defaultProps,
      slots: {
        header: '<div class="header-dude"></div>',
        footer: '<div id="footer-dude"><span>1</span><span>2</span></div>'
      },
      scopedSlots: {
        default: `
          <h1 slot-scope="{suggestion}">{{ suggestion.item }}</h1>
        `
      },
      attachToDocument: true
    });

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "G" });
    
    expect(wrapper.findAll('.header-dude').length).toEqual(1);
    expect(wrapper.findAll('#footer-dude span').length).toEqual(2);
    expect(wrapper.findAll('h1').length).toEqual(5);

    await wrapper.vm.$nextTick(() => {});

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("can customize ids and classes for container divs", async () => {
    const wrapper = mount(Autosuggest, {
      propsData: {
        ...defaultProps,
        class: "containerz",
        'component-attr-id-autosuggest': "automatischsuchen",
        'component-attr-class-autosuggest-results-container': 'resultz-containerz',
        'component-attr-class-autosuggest-results': 'resultz'
      },
      attachToDocument: true
    });

    expect(wrapper.find('#automatischsuchen').is('div')).toBe(true);
    expect(wrapper.find('.containerz').is('div')).toBe(true);
    expect(wrapper.find('.resultz-containerz').is('div')).toBe(true);
    expect(wrapper.find(`#${defaultProps.inputProps.id}`).is('input')).toBe(true);

    const renderer = createRenderer();
    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });

  it("@click and @selected listener events works as expected", async () => {
    let props = Object.assign({}, defaultProps);

    delete props['sectionConfigs']

    const mockFn = jest.fn();
    const mockConsole = jest.fn();

    console.warn = mockConsole;

    const wrapper = mount(Autosuggest, {
      propsData: props,
      listeners: {
        click: e => {
          mockFn(e);
        },
        selected: e => {
          mockFn(e);
        }
      },
      attachToDocument: true
    });

    await wrapper.vm.$nextTick(() => {});

    const input = wrapper.find("input");
    input.trigger("click");
    wrapper.setData({ searchInput: "F" });

    input.trigger("keydown.down");
    input.trigger("keydown.enter");

    expect(input.element.value).toBe("clifford kits");

    expect(mockConsole).toHaveBeenCalledTimes(0);
    expect(mockFn).toHaveBeenCalledTimes(2);

    const renderer = createRenderer();

    renderer.renderToString(wrapper.vm, (err, str) => {
      if (err) {
        return false;
      }
      expect(str).toMatchSnapshot();
    });
  });
});
