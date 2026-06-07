// 99 Nights - Survival Game

class Game {
    constructor() {
        this.canvas = document.getElementById('game-canvas');
        this.ctx = this.canvas.getContext('2d');
        
        // Game state
        this.day = 1;
        this.nightTime = 0;
        this.maxNightTime = 480; // 8 minutes = 480 seconds
        
        // Player stats
        this.player = {
            x: 400,
            y: 300,
            width: 24,
            height: 32,
            health: 100,
            maxHealth: 100,
            hunger: 80,
            maxHunger: 100,
            vx: 0,
            vy: 0,
            speed: 3,
            angle: 0
        };
        
        // Resources
        this.resources = {
            wood: 0,
            fireLevel: 20,
            maxFireLevel: 20
        };
        
        // Camp
        this.camp = {
            x: 400,
            y: 300,
            radius: 150,
            walls: 0,
            maxWalls: 20
        };
        
        // Enemies
        this.enemies = [];
        this.spawnTimer = 0;
        this.attackCooldown = 0;
        
        // Game objects
        this.trees = this.generateTrees();
        this.campfires = [{x: 400, y: 300, size: 40}];
        this.projectiles = [];
        
        // Input handling
        this.keys = {};
        this.mouseX = this.canvas.width / 2;
        this.mouseY = this.canvas.height / 2;
        this.isAttacking = false;
        
        // Game settings
        this.isPaused = false;
        this.gameOver = false;
        this.lastFrameTime = 0;
        
        this.setupEventListeners();
        this.gameLoop();
    }
    
    generateTrees() {
        const trees = [];
        for (let i = 0; i < 20; i++) {
            trees.push({
                x: Math.random() * (this.canvas.width - 200) + 100,
                y: Math.random() * (this.canvas.height - 200) + 100,
                size: Math.random() * 20 + 15,
                wood: 3
            });
        }
        return trees;
    }
    
    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
            
            if (e.key.toLowerCase() === 'f') this.addWood();
            if (e.key.toLowerCase() === 'b') this.buildWall();
            if (e.key.toLowerCase() === 'e') this.interact();
            if (e.key.toLowerCase() === 'escape') this.togglePause();
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
        
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouseX = e.clientX - rect.left;
            this.mouseY = e.clientY - rect.top;
            
            const dx = this.mouseX - this.player.x;
            const dy = this.mouseY - this.player.y;
            this.player.angle = Math.atan2(dy, dx);
        });
        
        this.canvas.addEventListener('click', () => {
            if (!this.gameOver && !this.isPaused && this.attackCooldown <= 0) {
                this.attack();
            }
        });
    }
    
    updatePlayerMovement() {
        this.player.vx = 0;
        this.player.vy = 0;
        
        if (this.keys['w'] || this.keys['arrowup']) this.player.vy -= this.player.speed;
        if (this.keys['s'] || this.keys['arrowdown']) this.player.vy += this.player.speed;
        if (this.keys['a'] || this.keys['arrowleft']) this.player.vx -= this.player.speed;
        if (this.keys['d'] || this.keys['arrowright']) this.player.vx += this.player.speed;
        
        this.player.x += this.player.vx;
        this.player.y += this.player.vy;
        
        // Boundary check
        this.player.x = Math.max(20, Math.min(this.canvas.width - 20, this.player.x));
        this.player.y = Math.max(20, Math.min(this.canvas.height - 20, this.player.y));
    }
    
    spawnEnemies() {
        this.spawnTimer++;
        const spawnRate = Math.max(30, 120 - this.day * 5);
        const maxEnemies = 2 + Math.floor(this.day / 2);
        
        if (this.spawnTimer > spawnRate && this.enemies.length < maxEnemies) {
            const angle = Math.random() * Math.PI * 2;
            const distance = 300;
            const x = this.canvas.width / 2 + Math.cos(angle) * distance;
            const y = this.canvas.height / 2 + Math.sin(angle) * distance;
            
            this.enemies.push({
                x: Math.max(20, Math.min(this.canvas.width - 20, x)),
                y: Math.max(20, Math.min(this.canvas.height - 20, y)),
                width: 25,
                height: 25,
                health: 20 + this.day * 5,
                maxHealth: 20 + this.day * 5,
                speed: 1 + this.day * 0.1,
                damage: 5 + this.day * 1,
                color: this.getEnemyColor()
            });
            this.spawnTimer = 0;
        }
    }
    
    getEnemyColor() {
        const colors = ['#8B2626', '#A53232', '#C43C3C', '#D94D4D'];
        return colors[Math.floor(Math.random() * colors.length)];
    }
    
    updateEnemies() {
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            
            // Move towards player
            const dx = this.player.x - enemy.x;
            const dy = this.player.y - enemy.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist > 0) {
                enemy.x += (dx / dist) * enemy.speed;
                enemy.y += (dy / dist) * enemy.speed;
            }
            
            // Keep in bounds
            enemy.x = Math.max(20, Math.min(this.canvas.width - 20, enemy.x));
            enemy.y = Math.max(20, Math.min(this.canvas.height - 20, enemy.y));
            
            // Check collision with player
            if (dist < 30) {
                this.player.health = Math.max(0, this.player.health - enemy.damage * 0.016);
            }
            
            // Remove if dead
            if (enemy.health <= 0) {
                this.enemies.splice(i, 1);
                this.resources.wood += 2;
            }
        }
    }
    
    updateFire() {
        // Fire decreases over time
        this.resources.fireLevel = Math.max(0, this.resources.fireLevel - 0.05);
        
        if (this.resources.fireLevel <= 0) {
            this.player.health = Math.max(0, this.player.health - 0.1); // Take damage in darkness
        }
    }
    
    updateHunger() {
        this.resources.hunger = Math.max(0, this.resources.hunger - 0.02);
        if (this.resources.hunger < 30) {
            this.player.health = Math.max(0, this.player.health - 0.05);
        }
    }
    
    updateProjectiles() {
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            proj.x += Math.cos(proj.angle) * proj.speed;
            proj.y += Math.sin(proj.angle) * proj.speed;
            proj.life--;
            
            // Check collision with enemies
            for (let j = this.enemies.length - 1; j >= 0; j--) {
                const enemy = this.enemies[j];
                const dx = proj.x - enemy.x;
                const dy = proj.y - enemy.y;
                if (Math.sqrt(dx * dx + dy * dy) < 20) {
                    enemy.health = Math.max(0, enemy.health - 10);
                    this.projectiles.splice(i, 1);
                    break;
                }
            }
            
            // Remove if off screen or dead
            if (proj.life <= 0 || proj.x < 0 || proj.x > this.canvas.width || proj.y < 0 || proj.y > this.canvas.height) {
                if (i < this.projectiles.length) {
                    this.projectiles.splice(i, 1);
                }
            }
        }
    }
    
    interact() {
        // Chop trees near player
        for (let i = this.trees.length - 1; i >= 0; i--) {
            const tree = this.trees[i];
            const dx = tree.x - this.player.x;
            const dy = tree.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            
            if (dist < 60) {
                this.resources.wood += tree.wood;
                this.trees.splice(i, 1);
                break;
            }
        }
    }
    
    attack() {
        this.projectiles.push({
            x: this.player.x + Math.cos(this.player.angle) * 15,
            y: this.player.y + Math.sin(this.player.angle) * 15,
            angle: this.player.angle,
            speed: 6,
            life: 150
        });
        this.attackCooldown = 10;
    }
    
    addWood() {
        if (this.resources.wood >= 5) {
            this.resources.fireLevel = Math.min(this.resources.fireLevel + 10, this.resources.maxFireLevel);
            this.resources.wood -= 5;
        }
    }
    
    buildWall() {
        if (this.resources.wood >= 10 && this.camp.walls < this.camp.maxWalls) {
            this.resources.wood -= 10;
            this.camp.walls++;
        }
    }
    
    togglePause() {
        this.isPaused = !this.isPaused;
    }
    
    updateTime() {
        if (!this.isPaused) {
            this.nightTime++;
            
            if (this.nightTime >= this.maxNightTime) {
                this.nextDay();
            }
        }
    }
    
    nextDay() {
        this.day++;
        this.nightTime = 0;
        this.enemies = [];
        this.spawnTimer = 0;
        this.resources.fireLevel = this.resources.maxFireLevel;
        this.resources.hunger = Math.min(this.resources.hunger + 30, this.resources.maxHunger);
        
        // Regenerate trees
        if (Math.random() > 0.3) {
            this.trees.push({
                x: Math.random() * (this.canvas.width - 200) + 100,
                y: Math.random() * (this.canvas.height - 200) + 100,
                size: Math.random() * 20 + 15,
                wood: 3
            });
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x, this.player.y);
        this.ctx.rotate(this.player.angle);
        
        // Body
        this.ctx.fillStyle = '#E8C66E';
        this.ctx.fillRect(-8, -12, 16, 24);
        
        // Head
        this.ctx.fillStyle = '#F0D89F';
        this.ctx.fillRect(-6, -16, 12, 8);
        
        // Weapon
        this.ctx.strokeStyle = '#8B6F47';
        this.ctx.lineWidth = 4;
        this.ctx.beginPath();
        this.ctx.moveTo(8, -2);
        this.ctx.lineTo(20, -2);
        this.ctx.stroke();
        
        this.ctx.restore();
    }
    
    drawEnemies() {
        for (let enemy of this.enemies) {
            // Health bar
            this.ctx.fillStyle = '#333';
            this.ctx.fillRect(enemy.x - 15, enemy.y - 25, 30, 5);
            
            this.ctx.fillStyle = '#FF4444';
            this.ctx.fillRect(enemy.x - 15, enemy.y - 25, (enemy.health / enemy.maxHealth) * 30, 5);
            
            // Enemy body
            this.ctx.fillStyle = enemy.color;
            this.ctx.beginPath();
            this.ctx.arc(enemy.x, enemy.y, 12, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Eyes
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(enemy.x - 4, enemy.y - 3, 2, 0, Math.PI * 2);
            this.ctx.fill();
            this.ctx.beginPath();
            this.ctx.arc(enemy.x + 4, enemy.y - 3, 2, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawTrees() {
        for (let tree of this.trees) {
            // Tree trunk
            this.ctx.fillStyle = '#654321';
            this.ctx.fillRect(tree.x - 4, tree.y + 5, 8, 12);
            
            // Tree foliage
            this.ctx.fillStyle = '#228B22';
            this.ctx.beginPath();
            this.ctx.arc(tree.x, tree.y, tree.size, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawCamp() {
        // Camp radius
        this.ctx.strokeStyle = 'rgba(212, 175, 55, 0.3)';
        this.ctx.lineWidth = 2;
        this.ctx.setLineDash([5, 5]);
        this.ctx.beginPath();
        this.ctx.arc(this.camp.x, this.camp.y, this.camp.radius, 0, Math.PI * 2);
        this.ctx.stroke();
        this.ctx.setLineDash([]);
        
        // Campfire
        for (let fire of this.campfires) {
            // Fire glow
            const gradient = this.ctx.createRadialGradient(fire.x, fire.y, 0, fire.x, fire.y, fire.size * 1.5);
            gradient.addColorStop(0, 'rgba(255, 200, 0, 0.4)');
            gradient.addColorStop(1, 'rgba(255, 100, 0, 0)');
            this.ctx.fillStyle = gradient;
            this.ctx.beginPath();
            this.ctx.arc(fire.x, fire.y, fire.size * 1.5, 0, Math.PI * 2);
            this.ctx.fill();
            
            // Fire
            this.ctx.fillStyle = '#FF6600';
            this.ctx.beginPath();
            this.ctx.arc(fire.x, fire.y, fire.size, 0, Math.PI * 2);
            this.ctx.fill();
            
            this.ctx.fillStyle = '#FFAA00';
            this.ctx.beginPath();
            this.ctx.arc(fire.x, fire.y, fire.size * 0.7, 0, Math.PI * 2);
            this.ctx.fill();
        }
        
        // Walls
        this.ctx.strokeStyle = '#8B6F47';
        this.ctx.lineWidth = 3;
        for (let i = 0; i < this.camp.walls; i++) {
            const angle = (i / this.camp.maxWalls) * Math.PI * 2;
            const x = this.camp.x + Math.cos(angle) * (this.camp.radius - 10);
            const y = this.camp.y + Math.sin(angle) * (this.camp.radius - 10);
            
            this.ctx.strokeRect(x - 8, y - 15, 16, 30);
        }
    }
    
    drawProjectiles() {
        for (let proj of this.projectiles) {
            this.ctx.fillStyle = '#FFD700';
            this.ctx.beginPath();
            this.ctx.arc(proj.x, proj.y, 3, 0, Math.PI * 2);
            this.ctx.fill();
        }
    }
    
    drawUI() {
        // Night darkness increases
        const darkness = Math.max(0, this.nightTime / this.maxNightTime * 0.7);
        this.ctx.fillStyle = `rgba(0, 0, 0, ${darkness})`;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
    
    updateUI() {
        // Update stats display
        document.getElementById('day-display').textContent = `Day ${this.day}`;
        
        const minutes = Math.floor(this.nightTime / 60);
        const seconds = Math.floor(this.nightTime % 60);
        document.getElementById('time-display').textContent = `Night ${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        
        document.getElementById('health-text').textContent = `${Math.floor(this.player.health)} / ${this.player.maxHealth}`;
        document.getElementById('health-fill').style.width = (this.player.health / this.player.maxHealth * 100) + '%';
        
        document.getElementById('hunger-text').textContent = `${Math.floor(this.resources.hunger)} / ${this.resources.maxHunger}`;
        document.getElementById('hunger-fill').style.width = (this.resources.hunger / this.resources.maxHunger * 100) + '%';
        
        document.getElementById('fire-text').textContent = `${Math.floor(this.resources.fireLevel)} / ${this.resources.maxFireLevel}`;
        document.getElementById('fire-fill').style.width = (this.resources.fireLevel / this.resources.maxFireLevel * 100) + '%';
        
        document.getElementById('wood-count').textContent = this.resources.wood;
        
        // Check game over
        if (this.player.health <= 0) {
            this.gameOver = true;
        }
    }
    
    drawGameOver() {
        this.ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        this.ctx.fillStyle = '#FF4444';
        this.ctx.font = 'bold 48px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('GAME OVER', this.canvas.width / 2, this.canvas.height / 2 - 40);
        
        this.ctx.fillStyle = '#D4AF37';
        this.ctx.font = '24px Arial';
        this.ctx.fillText(`You survived ${this.day} days`, this.canvas.width / 2, this.canvas.height / 2 + 20);
    }
    
    update() {
        if (this.gameOver) return;
        if (this.isPaused) return;
        
        this.updatePlayerMovement();
        this.spawnEnemies();
        this.updateEnemies();
        this.updateFire();
        this.updateHunger();
        this.updateProjectiles();
        this.updateTime();
        
        this.attackCooldown--;
    }
    
    draw() {
        // Clear canvas
        this.ctx.fillStyle = '#1a3a1a';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Draw game objects
        this.drawTrees();
        this.drawCamp();
        this.drawEnemies();
        this.drawPlayer();
        this.drawProjectiles();
        
        // Draw UI overlay
        this.drawUI();
        
        // Draw game over if needed
        if (this.gameOver) {
            this.drawGameOver();
        }
    }
    
    gameLoop() {
        this.update();
        this.draw();
        this.updateUI();
        
        requestAnimationFrame(() => this.gameLoop());
    }
}

// Start game when page loads
window.addEventListener('load', () => {
    new Game();
});