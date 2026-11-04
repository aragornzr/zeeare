allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}

// Finder/cloud-sync numbered copies retain the same JVM class name. D8 rejects
// them even when the filenames differ. Repair generated output before Gradle
// snapshots compiler, JAR and DEX task outputs, so missing outputs rebuild normally.
subprojects {
    val moduleBuildDirectory = layout.buildDirectory
    val guardAndroidClasses = tasks.register("guardAndroidClasses") {
        doLast {
            val duplicateClassName = Regex("^(.+) [0-9]+\\.class$")
            val duplicateArtifactName = Regex("^(.+) [0-9]+\\.(class|dex|jar)$")
            val generatedFiles = moduleBuildDirectory.get().asFile.walkTopDown()
                .filter { it.isFile }.toList()

            generatedFiles.forEach { duplicate ->
                val match = duplicateArtifactName.matchEntire(duplicate.name) ?: return@forEach
                val original = duplicate.resolveSibling(match.groupValues[1] + "." + match.groupValues[2])
                check(original.isFile && original.readBytes().contentEquals(duplicate.readBytes())) {
                    "Conflicting generated artifact: $duplicate. Run flutter clean and rebuild."
                }
                check(duplicate.delete()) { "Could not remove generated duplicate: $duplicate" }
                logger.lifecycle("Removed generated artifact duplicate: $duplicate")
            }

            generatedFiles.filter { it.extension == "jar" && it.isFile }.forEach { jar ->
                val containsDuplicates = java.util.zip.ZipFile(jar).use { archive ->
                    val duplicates = archive.entries().asSequence().filter {
                        duplicateClassName.matches(it.name.substringAfterLast('/'))
                    }.toList()
                    duplicates.forEach { duplicate ->
                        val originalName = duplicate.name.replace(Regex(" [0-9]+\\.class$"), ".class")
                        val original = archive.getEntry(originalName)
                        check(original != null &&
                            archive.getInputStream(original).use { it.readBytes() }.contentEquals(
                                archive.getInputStream(duplicate).use { it.readBytes() }
                            )) {
                            "Conflicting generated class in $jar: ${duplicate.name}. " +
                                "Run flutter clean and rebuild."
                        }
                    }
                    duplicates.isNotEmpty()
                }
                if (containsDuplicates) {
                    check(jar.delete()) { "Could not discard duplicate-containing JAR: $jar" }
                    logger.lifecycle("Discarded generated JAR with duplicate classes: $jar")
                }
            }
        }
    }

    tasks.matching {
        it.name == "preBuild" ||
            it.name.matches(Regex("compile.*(JavaWithJavac|Kotlin)")) ||
            it.name.matches(Regex("bundle.*(Classes|Runtime|Compile).*Jar.*")) ||
            it.name.startsWith("dexBuilder") ||
            it.name.matches(Regex("merge.*Dex.*"))
    }.configureEach {
        dependsOn(guardAndroidClasses)
    }
}

// Include plugin modules: their cached resources can contain the same duplicates.
subprojects {
    // File-copy/sync tools can leave numbered copies in cached Android resources.
    // Check on every build, including incremental builds where packaging is skipped.
    val sourceResources = file("src")
    val packagedResources = layout.buildDirectory.dir("intermediates/packaged_res")
    val generatedSources = layout.buildDirectory.dir("generated/source")
    val generatedResources = layout.buildDirectory.dir("generated/res")
    val incrementalResources = layout.buildDirectory.dir("intermediates/incremental")
    val guardAndroidResources = tasks.register("guardAndroidResources") {
        doLast {
            val invalidSources = sourceResources.walkTopDown().filter {
                it.isFile && it.relativeTo(sourceResources).invariantSeparatorsPath.contains("/res/") &&
                    !it.name.matches(Regex("[a-z0-9_.]+"))
            }.toList()
            check(invalidSources.isEmpty()) {
                "Invalid Android resource filenames: ${invalidSources.joinToString()}. " +
                    "Use lowercase letters, digits, underscores and extension dots."
            }

            val duplicateName = Regex("^(.+) [0-9]+(\\.[^.]+)$")
            listOf(
                packagedResources.get().asFile,
                generatedSources.get().asFile,
                generatedResources.get().asFile,
                incrementalResources.get().asFile,
            )
                .asSequence().flatMap { it.walkTopDown() }.filter { it.isFile }.forEach { duplicate ->
                // Incremental directories also hold merger metadata, which is not a resource.
                if (duplicate.startsWith(incrementalResources.get().asFile) &&
                    !duplicate.relativeTo(incrementalResources.get().asFile)
                        .invariantSeparatorsPath.contains("/merged.dir/")) return@forEach
                val match = duplicateName.matchEntire(duplicate.name) ?: return@forEach
                val original = duplicate.resolveSibling(match.groupValues[1] + match.groupValues[2])
                check(original.isFile && original.readBytes().contentEquals(duplicate.readBytes())) {
                    "Unexpected generated resource: $duplicate. Run flutter clean and rebuild."
                }
                check(duplicate.delete()) { "Could not remove generated duplicate: $duplicate" }
                logger.lifecycle("Removed generated resource duplicate: $duplicate")
            }
        }
    }

    // Also protect direct resource task invocations and run before their input snapshots.
    tasks.matching {
        it.name == "preBuild" ||
            it.name.matches(Regex("process.*GoogleServices")) ||
            it.name.matches(Regex("(merge|package|process).*Resources"))
    }.configureEach {
        dependsOn(guardAndroidResources)
    }
}
