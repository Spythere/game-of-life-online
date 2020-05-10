<template>
  <div id="app">
    <router-view />
  </div>
</template>

<style lang="scss">
@import url("https://fonts.googleapis.com/css?family=Tomorrow&display=swap");

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  font-family: "Tomorrow", Helvetica, Arial, sans-serif;
}

ul {
  list-style: none;
}

body,
html {
  margin: 0;
  padding: 0;

  height: 100vh;

  overflow: hidden;
}

#app {
  background-color: rgb(42, 48, 82);

  height: 100%;
}
</style>
