---
  title: "analysis"
date: "8/23/2019"
output: html_document
---
  
  ## Setup
  
  ```{r setup}
library(tidyverse)
library(ggridges)
library(pwr) 
library(grid)
library(gtable)

library(boot)
library(bootES)


library(ggbeeswarm)

library(tidybayes)
library(cowplot)
library(broom)

theme_set(theme_tidybayes() + panel_border() + background_grid())


#df <- read.csv("../results/pilot/CSV/TidyR.csv")
df <- read.csv("../results/pilot/CSV/TidyR.csv")
dfp <- read.csv("../results/pilot/CSV/participantInfoTidyR.csv")

filteredData <- df %>% 
  filter( measure=="accuracy" | measure == "secondsOnTask")


filteredData$value = as.numeric( as.character(filteredData$value ))

filteredData %>% 
  mutate( userDriven = as.character(userDriven) ) 


labels.measure <- c(
  "secondsOnTask"  = "Time (minutes)",
  "accuracy"= "Accuracy",
  "difficulty"= "Difficulty",
  "confidence" = "Confidence"
)

```