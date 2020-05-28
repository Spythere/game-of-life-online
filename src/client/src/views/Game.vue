<template>
  <div class="game">
    <!-- 5x5 pattern creator  -->
    <section class="creator" v-if="patternCreator.isOpen">
      <h1 class="creator-header">Kreator struktur</h1>

      <ul class="creator-grid">
        <ul class="grid-row" v-for="(row, i) in patternCreator.grid" :key="i">
          <ul class="grid-col" v-for="(col, j) in patternCreator.grid[i]" :key="j">
            <li
              class="grid-cell"
              :class="patternCreator.grid[i][j] ? 'activated' : ''"
              @click="patternCreator.toggleCell(i, j)"
            ></li>
          </ul>
        </ul>
      </ul>

      <div class="creator-actions">
        <button
          class="action_choose-pattern"
          @click="patternCreator.choosePattern()"
        >Dodaj strukturę</button>
        <button class="action_close-creator" @click="patternCreator.closeCreator()">Wyjdź z kreatora</button>
      </div>
    </section>

    <main class="main-content">
      <div class="game-wrapper">
        <div class="floating-actions">
          <button
            class="action_open-creator"
            @click="patternCreator.isOpen ? patternCreator.closeCreator() : patternCreator.openCreator()"
          >Kreator</button>
          <button class="action_toggle-heatmap" @click="toggleHeatmapView()">Heatmap</button>
        </div>
        <v-touch @touch="console.log('xd');">
          <canvas
            ref="canvas"
            @mousemove="mouseMove"
            @click="canvasClick"
            @mousedown="mouseDown"
            @mouseup="mouseUp"
          ></canvas>
        </v-touch>
      </div>
    </main>
  </div>
</template>

<script lang="ts" src="@/scripts/game.ts">
</script>

<style lang="scss" scoped>
.game {
  height: 100%;

  display: flex;
  justify-content: center;
  align-items: center;
}

button {
  outline: none;
  border: none;

  &:focus {
    color: white;
  }

  background: rgba(black, 0.8);
  padding: 0.6rem;
  font-size: 1.1rem;
  color: gold;

  cursor: pointer;
}

.creator {
  position: fixed;
  z-index: 4;

  background: rgba(black, 0.8);
  color: white;
  padding: 1rem;

  display: flex;
  flex-direction: column;
  align-items: center;

  text-align: center;

  @media screen and (max-width: 600px) {
    width: 100%;
  }

  &-header {
    font-size: 4rem;
    margin-bottom: 2rem;
  }

  &-grid {
    display: flex;
    flex-direction: column;

    font-size: 1.5rem;
    margin-bottom: 1rem;

    .grid-row {
      display: flex;
    }

    .grid-cell {
      border: 1px solid gray;
      background: white;

      width: 45px;
      height: 45px;

      &.activated {
        background: black;
      }
    }
  }

  &-actions button {
    margin: 1rem 1rem;
  }
}

.main-content {
  display: flex;
  justify-content: center;
  align-items: center;

  position: relative;

  .floating-actions {
    position: absolute;
    top: 0;
    right: 0;
    z-index: 2;

    display: flex;
    flex-direction: column;

    width: 11em;
    padding: 0.5rem;

    button {
      padding: 0.5rem;
      margin-bottom: 1rem;
    }
  }

  canvas {
    position: relative;
    z-index: 1;

    border: 1px solid white;
  }
}
</style>
